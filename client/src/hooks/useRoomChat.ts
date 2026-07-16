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

export function useRoomChat({ roomCode, sessionId, playerNumber }: UseRoomChatOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteReadyRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const broadcast = useCallback(async (event: string, payload: SignalPayload) => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: "broadcast", event, payload: { ...payload, from: sessionId } });
  }, [sessionId]);

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
  }, []);

  const ensurePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
  }, [broadcast]);

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
      await broadcast("voice-offer", { description: peer.localDescription });
    } catch {
      closePeer();
      setVoiceStatus("error");
    } finally {
      makingOfferRef.current = false;
    }
  }, [broadcast, closePeer, ensurePeer]);

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
            await broadcast("voice-answer", { description: peer.localDescription });
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
      .on("broadcast", { event: "voice-leave" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (signal.from === sessionId) return;
        remoteReadyRef.current = false;
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
  }, [addPendingCandidates, broadcast, closePeer, ensurePeer, makeOffer, playerNumber, roomCode, sessionId]);

  useEffect(() => {
    if (voiceStatus !== "waiting" || !channelReady) return;
    void broadcast("voice-ready", {});
    const heartbeat = window.setInterval(() => void broadcast("voice-ready", {}), 1_000);
    return () => window.clearInterval(heartbeat);
  }, [broadcast, channelReady, voiceStatus]);
  useEffect(() => () => {
    closePeer();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
  }, [closePeer]);

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
    if (localStreamRef.current) {
      closePeer();
      setVoiceStatus("waiting");
      await broadcast("voice-ready", {});
      if (remoteReadyRef.current && playerNumber === 1) await makeOffer();
      return;
    }
    setVoiceStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setMuted(false);
      setVoiceStatus("waiting");
      await broadcast("voice-ready", {});
      if (remoteReadyRef.current && playerNumber === 1) await makeOffer();
    } catch {
      setVoiceStatus("error");
    }
  }, [broadcast, channelReady, closePeer, makeOffer, playerNumber]);

  const leaveVoice = useCallback(() => {
    void broadcast("voice-leave", {});
    closePeer();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    remoteReadyRef.current = false;
    setMuted(false);
    setVoiceStatus("idle");
  }, [broadcast, closePeer]);

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
    sendMessage,
    startVoice,
    leaveVoice,
    toggleMute,
  };
}