import { MessageCircle, Mic, MicOff, PhoneOff, Send, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerNumber } from "@needs-two/shared";
import type { ChatMessage, VoiceStatus } from "../hooks/useRoomChat";
import { t } from "../i18n";

interface GameChatProps {
  open: boolean;
  playerNumber: PlayerNumber;
  messages: ChatMessage[];
  channelReady: boolean;
  voiceStatus: VoiceStatus;
  muted: boolean;
  remoteStream: MediaStream | null;
  onClose: () => void;
  onSend: (message: string) => Promise<boolean>;
  onStartVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
}

function voiceLabel(status: VoiceStatus) {
  if (status === "requesting") return t("voiceRequesting");
  if (status === "waiting") return t("voiceWaiting");
  if (status === "connecting") return t("voiceConnecting");
  if (status === "connected") return t("voiceConnected");
  if (status === "error") return t("voiceError");
  return t("voiceIdle");
}

export function GameChat({
  open,
  playerNumber,
  messages,
  channelReady,
  voiceStatus,
  muted,
  remoteStream,
  onClose,
  onSend,
  onStartVoice,
  onLeaveVoice,
  onToggleMute,
}: GameChatProps) {
  const [draft, setDraft] = useState("");
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (open) messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open]);

  const playRemoteAudio = useCallback(async () => {
    const audio = remoteAudio.current;
    if (!audio || !audio.srcObject) return;
    audio.muted = false;
    audio.volume = 1;
    try {
      await audio.play();
      setPlaybackBlocked(false);
    } catch {
      setPlaybackBlocked(true);
    }
  }, []);

  useEffect(() => {
    const audio = remoteAudio.current;
    if (!audio) return;
    audio.srcObject = remoteStream;
    if (!remoteStream) {
      setPlaybackBlocked(false);
      return;
    }
    const startPlayback = () => void playRemoteAudio();
    audio.addEventListener("loadedmetadata", startPlayback);
    void playRemoteAudio();
    return () => audio.removeEventListener("loadedmetadata", startPlayback);
  }, [playRemoteAudio, remoteStream]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await onSend(draft)) setDraft("");
  }

  const voiceStarting = voiceStatus === "requesting";
  const voiceActive = ["waiting", "connecting", "connected"].includes(voiceStatus);

  return (
    <>
      <audio ref={remoteAudio} autoPlay playsInline aria-hidden="true" data-testid="remote-audio" onCanPlay={() => void playRemoteAudio()} />
      {open && (
        <aside className="chat-panel" aria-label={t("chat")} data-testid="game-chat">
          <header className="chat-header">
            <div>
              <span className="chat-title"><MessageCircle size={18} />{t("chat")}</span>
              <span className={`voice-status voice-${voiceStatus}`}>{voiceLabel(voiceStatus)}</span>
            </div>
            <button className="icon-button icon-button-small" onClick={onClose} aria-label={t("closeChat")} title={t("closeChat")}>
              <X size={18} />
            </button>
          </header>

          {playbackBlocked && (
            <button className="voice-playback" onClick={() => void playRemoteAudio()}>
              <Volume2 size={16} />
              <span>{t("playVoiceAudio")}</span>
            </button>
          )}
          <div className="voice-controls">
            {!voiceActive ? (
              <button className="voice-button" onClick={onStartVoice} disabled={!channelReady || voiceStarting}>
                <Mic size={17} />
                <span>{voiceStatus === "error" ? t("retryVoice") : t("startVoice")}</span>
              </button>
            ) : (
              <>
                <button className="voice-button" onClick={onToggleMute} aria-label={muted ? t("unmuteMicrophone") : t("muteMicrophone")}>
                  {muted ? <MicOff size={17} /> : <Mic size={17} />}
                  <span>{muted ? t("microphoneMuted") : t("microphoneOn")}</span>
                </button>
                <button className="icon-button icon-button-small voice-leave" onClick={onLeaveVoice} aria-label={t("stopVoice")} title={t("stopVoice")}>
                  <PhoneOff size={17} />
                </button>
              </>
            )}
          </div>

          <div className="chat-messages" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && <p className="chat-empty">{t("noMessages")}</p>}
            {messages.map((message) => {
              const own = message.senderNumber === playerNumber;
              return (
                <div className={`chat-message ${own ? "is-own" : ""}`} key={message.id}>
                  <span className="chat-author">{own ? t("you") : t("friend")}</span>
                  <p>{message.text}</p>
                  <time dateTime={new Date(message.sentAt).toISOString()}>
                    {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(message.sentAt)}
                  </time>
                </div>
              );
            })}
            <div ref={messagesEnd} />
          </div>

          <form className="chat-form" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="chat-message">{t("messagePlaceholder")}</label>
            <input
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={280}
              placeholder={t("messagePlaceholder")}
              autoComplete="off"
              disabled={!channelReady}
            />
            <button className="chat-send" type="submit" disabled={!draft.trim() || !channelReady} aria-label={t("sendMessage")} title={t("sendMessage")}>
              <Send size={18} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}