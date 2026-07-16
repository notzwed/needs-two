import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerNumber } from "@needs-two/shared";
import { supabase } from "../supabaseClient";

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderNumber: PlayerNumber;
  sentAt: number;
}

export type VoiceStatus = "idle" | "requesting" | "waiting" | "connecting" | "connected" | "error";

interface UseRoomChatOptions {
  roomCode: string;
  sessionId: string;
  playerNumber: PlayerNumber;
}

type SignalPayload = Record<string, unknown> & { from?: string };
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];


interface RelayCapture {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  sink: GainNode;
}

function encodePcm(samples: number[]): string {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 4_096) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 4_096));
  }
  return btoa(binary);
}

function decodePcm(encoded: string): Float32Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const pcm = new Int16Array(bytes.buffer);
  const samples = new Float32Array(pcm.length);
  for (let index = 0; index < pcm.length; index += 1) {
    const value = pcm[index] ?? 0;
    samples[index] = value / (value < 0 ? 0x8000 : 0x7fff);
  }
  return samples;
}
function waitForIceGathering(peer: RTCPeerConnection, timeoutMs = 2_500): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", checkState);
      resolve();
    };
    const checkState = () => {
      if (peer.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    peer.addEventListener("icegatheringstatechange", checkState);
  });
}

export function useRoomChat({ roomCode, sessionId, playerNumber }: UseRoomChatOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteReadyRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const connectionTimeoutRef = useRef<number | null>(null);
  const relayCaptureRef = useRef<RelayCapture | null>(null);
  const relaySamplesRef = useRef<number[]>([]);
  const relayPlaybackRef = useRef<AudioContext | null>(null);
  const relayNextPlaybackRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [voiceTransport, setVoiceTransport] = useState<"webrtc" | "supabase" | null>(null);
  const voiceTransportRef = useRef<"webrtc" | "supabase" | null>(null);
  const [relayPacketsReceived, setRelayPacketsReceived] = useState(0);

  const broadcast = useCallback(async (event: string, payload: SignalPayload) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: "broadcast", event, payload: { ...payload, from: sessionId } });
  }, [sessionId]);

  const stopRelayCapture = useCallback(() => {
    const capture = relayCaptureRef.current;
    if (!capture) return;
    capture.processor.onaudioprocess = null;
    capture.source.disconnect();
    capture.processor.disconnect();
    capture.sink.disconnect();
    void capture.context.close();
    relayCaptureRef.current = null;
    relaySamplesRef.current = [];
  }, []);

  const stopRelayPlayback = useCallback(() => {
    if (relayPlaybackRef.current) void relayPlaybackRef.current.close();
    relayPlaybackRef.current = null;
    relayNextPlaybackRef.current = 0;
  }, []);

  const ensureRelayPlayback = useCallback(async () => {
    let context = relayPlaybackRef.current;
    if (!context || context.state === "closed") {
      context = new AudioContext({ latencyHint: "interactive" });
      relayPlaybackRef.current = context;
    }
    if (context.state === "suspended") await context.resume();
    return context;
  }, []);

  const playRelayAudio = useCallback(async (encoded: string, sampleRate: number) => {
    try {
      const samples = decodePcm(encoded);
      if (samples.length === 0) return;
      const context = await ensureRelayPlayback();
      const buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      if (relayNextPlaybackRef.current > context.currentTime + 1) {
        relayNextPlaybackRef.current = context.currentTime + 0.04;
      }
      const startsAt = Math.max(context.currentTime + 0.04, relayNextPlaybackRef.current);
      source.start(startsAt);
      relayNextPlaybackRef.current = startsAt + buffer.duration;
      setRelayPacketsReceived((count) => count + 1);
    } catch {
      // A malformed or late frame is skipped without ending the voice session.
    }
  }, [ensureRelayPlayback]);

  const startRelayCapture = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || relayCaptureRef.current) return;
    const context = new AudioContext({ latencyHint: "interactive" });
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4_096, 1, 1);
    const sink = context.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const step = Math.max(1, event.inputBuffer.sampleRate / 16_000);
      for (let position = 0; position < input.length; position += step) {
        relaySamplesRef.current.push(input[Math.floor(position)] ?? 0);
      }
      while (relaySamplesRef.current.length >= 6_400) {
        const frame = relaySamplesRef.current.splice(0, 6_400);
        void broadcast("voice-audio", {
          data: encodePcm(frame),
          sampleRate: 16_000,
        });
      }
    };
    source.connect(processor);
    processor.connect(sink);
    sink.connect(context.destination);
    relayCaptureRef.current = { context, source, processor, sink };
  }, [broadcast]);
  const closePeer = useCallback(() => {
    if (connectionTimeoutRef.current !== null) window.clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
  }, []);


  const activateRelayVoice = useCallback(async (announce: boolean) => {
    closePeer();
    try {
      await ensureRelayPlayback();
      await startRelayCapture();
      voiceTransportRef.current = "supabase";
      setVoiceTransport("supabase");
      setVoiceStatus("connected");
      if (announce) await broadcast("voice-relay-ready", {});
    } catch {
      setVoiceStatus("error");
    }
  }, [broadcast, closePeer, ensureRelayPlayback, startRelayCapture]);
  const ensurePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;
    const forceRelay = Boolean(
      (globalThis as typeof globalThis & { __NEEDS_TWO_FORCE_RELAY__?: boolean }).__NEEDS_TWO_FORCE_RELAY__,
    );
    const peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: forceRelay ? "relay" : "all",
    });
    for (const track of localStreamRef.current?.getTracks() ?? []) {
      peer.addTrack(track, localStreamRef.current!);
    }
    peer.onicecandidate = (event) => {
      if (event.candidate) void broadcast("voice-ice", { candidate: event.candidate.toJSON() });
    };
    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStream(stream);
    };
    const syncConnectionStatus = () => {
      if (
        peer.connectionState === "connected"
        || ["connected", "completed"].includes(peer.iceConnectionState)
      ) {
        if (connectionTimeoutRef.current !== null) window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        stopRelayCapture();
        stopRelayPlayback();
        voiceTransportRef.current = "webrtc";
        setVoiceTransport("webrtc");
        setVoiceStatus("connected");
      } else if (
        ["failed", "disconnected"].includes(peer.connectionState)
        || peer.iceConnectionState === "failed"
      ) {
        setVoiceStatus("waiting");
      }
    };
    peer.onconnectionstatechange = syncConnectionStatus;
    peer.oniceconnectionstatechange = syncConnectionStatus;
    peerRef.current = peer;
    return peer;
  }, [broadcast, stopRelayCapture, stopRelayPlayback]);

  const addPendingCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.splice(0);
    for (const candidate of pending) await peer.addIceCandidate(candidate);
  }, []);

  const makeOffer = useCallback(async () => {
    if (!localStreamRef.current || makingOfferRef.current) return;
    makingOfferRef.current = true;
    setVoiceStatus("connecting");
    try {
      const peer = ensurePeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGathering(peer);
      await broadcast("voice-offer", { description: peer.localDescription });
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (peerRef.current !== peer || peer.connectionState === "connected") return;
        void activateRelayVoice(true);
      }, 6_000);
    } catch {
      closePeer();
      setVoiceStatus("error");
    } finally {
      makingOfferRef.current = false;
    }
  }, [activateRelayVoice, broadcast, closePeer, ensurePeer]);

  useEffect(() => {
    const client = supabase;
    if (!client || !roomCode) return;
    const channel = client
      .channel(`needs-two-chat:${roomCode}`)
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        const message = payload as ChatMessage;
        if (
          message.senderId === sessionId
          || typeof message.id !== "string"
          || typeof message.text !== "string"
          || message.text.length > 280
        ) return;
        setMessages((current) => [...current.slice(-99), message]);
      })
      .on("broadcast", { event: "voice-ready" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId) return;
        const wasReady = remoteReadyRef.current;
        remoteReadyRef.current = true;
        if (localStreamRef.current && !wasReady) void broadcast("voice-ready", {});
        if (localStreamRef.current && playerNumber === 1 && !peerRef.current) void makeOffer();
      })
      .on("broadcast", { event: "voice-offer" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId || !localStreamRef.current || !signal.description) return;
        void (async () => {
          try {
            setVoiceStatus("connecting");
            const earlyCandidates = pendingCandidatesRef.current;
            closePeer();
            pendingCandidatesRef.current = earlyCandidates;
            const peer = ensurePeer();
            await peer.setRemoteDescription(signal.description as RTCSessionDescriptionInit);
            await addPendingCandidates(peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await waitForIceGathering(peer);
            await broadcast("voice-answer", { description: peer.localDescription });
            connectionTimeoutRef.current = window.setTimeout(() => {
              if (peerRef.current !== peer || peer.connectionState === "connected") return;
              void activateRelayVoice(true);
            }, 6_000);
          } catch {
            setVoiceStatus("error");
          }
        })();
      })
      .on("broadcast", { event: "voice-answer" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId || !peerRef.current || !signal.description) return;
        void (async () => {
          try {
            await peerRef.current!.setRemoteDescription(signal.description as RTCSessionDescriptionInit);
            await addPendingCandidates(peerRef.current!);
          } catch {
            setVoiceStatus("error");
          }
        })();
      })
      .on("broadcast", { event: "voice-ice" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId || !signal.candidate) return;
        const candidate = signal.candidate as RTCIceCandidateInit;
        const peer = peerRef.current;
        if (peer?.remoteDescription) void peer.addIceCandidate(candidate);
        else pendingCandidatesRef.current.push(candidate);
      })
      .on("broadcast", { event: "voice-relay-ready" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId || !localStreamRef.current) return;
        void activateRelayVoice(false);
      })
      .on("broadcast", { event: "voice-audio" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (
          signal.from === sessionId
          || voiceTransportRef.current === "webrtc"
          || typeof signal.data !== "string"
          || signal.data.length > 100_000
          || typeof signal.sampleRate !== "number"
          || signal.sampleRate < 8_000
          || signal.sampleRate > 48_000
        ) return;
        void playRelayAudio(signal.data, signal.sampleRate);
      })
      .on("broadcast", { event: "voice-leave" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId) return;
        remoteReadyRef.current = false;
        stopRelayCapture();
        stopRelayPlayback();
        voiceTransportRef.current = null;
        setVoiceTransport(null);
        closePeer();
        if (localStreamRef.current) setVoiceStatus("waiting");
      })
      .subscribe((status) => {
        const ready = status === "SUBSCRIBED";
        setChannelReady(ready);
        if (ready && localStreamRef.current) void broadcast("voice-ready", {});
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [activateRelayVoice, addPendingCandidates, broadcast, closePeer, ensurePeer, makeOffer, playRelayAudio, playerNumber, roomCode, sessionId, stopRelayCapture, stopRelayPlayback]);

  useEffect(() => {
    if (voiceStatus !== "waiting" || !channelReady) return;
    void broadcast("voice-ready", {});
    const heartbeat = window.setInterval(() => void broadcast("voice-ready", {}), 1_000);
    return () => window.clearInterval(heartbeat);
  }, [broadcast, channelReady, voiceStatus]);
  useEffect(() => () => {
    closePeer();
    stopRelayCapture();
    stopRelayPlayback();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
  }, [closePeer, stopRelayCapture, stopRelayPlayback]);

  const sendMessage = useCallback(async (value: string) => {
    const text = value.trim().slice(0, 280);
    if (!text || !channelReady) return false;
    const message: ChatMessage = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      senderId: sessionId,
      senderNumber: playerNumber,
      sentAt: Date.now(),
    };
    setMessages((current) => [...current.slice(-99), message]);
    await broadcast("chat-message", { ...message });
    return true;
  }, [broadcast, channelReady, playerNumber, sessionId]);

const startVoice = useCallback(async () => {
    if (!channelReady) return;
    setRelayPacketsReceived(0);
    voiceTransportRef.current = null;
    setVoiceTransport(null);
    setVoiceStatus("requesting");
    stopRelayCapture();
    stopRelayPlayback();
    try {
      await ensureRelayPlayback();
      if (localStreamRef.current) {
        closePeer();
        setVoiceStatus("waiting");
        await broadcast("voice-ready", {});
        if (remoteReadyRef.current && playerNumber === 1) await makeOffer();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
      setMuted(false);
      setVoiceStatus("waiting");
      await broadcast("voice-ready", {});
      if (remoteReadyRef.current && playerNumber === 1) await makeOffer();
    } catch {
      setVoiceStatus("error");
    }
  }, [
    broadcast,
    channelReady,
    closePeer,
    ensureRelayPlayback,
    makeOffer,
    playerNumber,
    stopRelayCapture,
    stopRelayPlayback,
  ]);

  const leaveVoice = useCallback(() => {
    void broadcast("voice-leave", {});
    closePeer();
    stopRelayCapture();
    stopRelayPlayback();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    remoteReadyRef.current = false;
    setMuted(false);
    voiceTransportRef.current = null;
    setVoiceTransport(null);
    setVoiceStatus("idle");
  }, [broadcast, closePeer, stopRelayCapture, stopRelayPlayback]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    for (const track of localStreamRef.current?.getAudioTracks() ?? []) track.enabled = !next;
    setMuted(next);
  }, [muted]);

  return {
    messages,
    channelReady,
    voiceStatus,
    muted,
    remoteStream,
    voiceTransport,
    relayPacketsReceived,
    sendMessage,
    startVoice,
    leaveVoice,
    toggleMute,
  };
}