import { Home, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlayerNumber, RoomState } from "@needs-two/shared";
import { CompletionModal } from "./CompletionModal";
import { GameChat } from "./GameChat";
import { PuzzleBoard } from "./PuzzleBoard";
import { PuzzleReference } from "./PuzzleReference";
import { TurnHeader } from "./TurnHeader";
import { VoiceInvite } from "./VoiceInvite";
import { ThemeToggle } from "./ThemeToggle";
import { useSound } from "../hooks/useSound";
import { useRoomChat } from "../hooks/useRoomChat";
import { t } from "../i18n";

interface GameScreenProps {
  room: RoomState;
  sessionId: string;
  connected: boolean;
  nightMode: boolean;
  onToggleTheme: () => void;
  onMove: (tileId: number) => Promise<{ ok: boolean; message?: string }>;
  onRematch: () => void;
  onHome: () => void;
}

export function GameScreen({ room, sessionId, connected, nightMode, onToggleTheme, onMove, onRematch, onHome }: GameScreenProps) {
  const player = room.players.find((candidate) => candidate.id === sessionId);
  const playerNumber = (player?.number ?? 1) as PlayerNumber;
  const chat = useRoomChat({ roomCode: room.code, sessionId, playerNumber });
  const [chatOpen, setChatOpen] = useState(false);
  const [seenRemoteMessages, setSeenRemoteMessages] = useState(0);
  const remoteMessageCount = chat.messages.filter((message) => message.senderNumber !== playerNumber).length;
  const unreadMessages = Math.max(0, remoteMessageCount - seenRemoteMessages);
  const canMove = connected && room.game.phase === "playing" && room.game.activePlayer === playerNumber;
  const isWatching = connected && room.game.phase === "playing" && room.game.activePlayer !== playerNumber;
  const disconnectedFriend = room.game.phase === "paused" || room.players.some((candidate) => !candidate.connected);
  const [notice, setNotice] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const { enabled, toggle, play } = useSound();
  const previousPhase = useRef(room.game.phase);
  const previousPlayer = useRef(room.game.activePlayer);

  useEffect(() => {
    if (chatOpen) setSeenRemoteMessages(remoteMessageCount);
  }, [chatOpen, remoteMessageCount]);

  useEffect(() => {
    if (previousPlayer.current !== room.game.activePlayer || (previousPhase.current !== "transition" && room.game.phase === "transition")) play("turn");
    if (previousPhase.current !== "completed" && room.game.phase === "completed" && room.game.completionReason === "solved") play("complete");
    previousPhase.current = room.game.phase;
    previousPlayer.current = room.game.activePlayer;
  }, [play, room.game.activePlayer, room.game.completionReason, room.game.phase]);

  useEffect(() => {
    if (room.game.phase !== "completed") {
      setShowCompletion(false);
      return;
    }
    const timer = window.setTimeout(() => setShowCompletion(true), 780);
    return () => window.clearTimeout(timer);
  }, [room.game.phase]);

  function waitNotice() {
    if (room.game.phase !== "playing" || room.game.activePlayer !== playerNumber) {
      setNotice(t("waitTurn"));
      window.setTimeout(() => setNotice(""), 1_100);
    }
  }

  async function move(tileId: number) {
    play("move");
    const result = await onMove(tileId);
    if (!result.ok && result.message) {
      setNotice(result.message);
      window.setTimeout(() => setNotice(""), 1_100);
    }
    return result.ok;
  }

  const moveCountKey = room.game.moveCount === 1 ? "moveCountOne" : "moveCountMany";

  return (
    <main className={`game-screen ${isWatching ? "is-watching" : "is-playing"}`}>
      <div className="game-topbar">
        <button className="icon-button" onClick={onHome} aria-label={t("backHome")} title={t("backHome")}><Home size={20} /></button>
        <span className="mini-brand">Needs Two</span>
        <div className="game-topbar-actions">
          <button
            className="icon-button chat-toggle"
            onClick={() => setChatOpen((open) => !open)}
            aria-label={chatOpen ? t("closeChat") : t("openChat")}
            title={chatOpen ? t("closeChat") : t("openChat")}
            aria-expanded={chatOpen}
          >
            <MessageCircle size={20} />
            {unreadMessages > 0 && <span className="chat-badge" aria-label={t("unreadMessages", { count: unreadMessages })}>{Math.min(unreadMessages, 9)}</span>}
          </button>
          <ThemeToggle nightMode={nightMode} onToggle={onToggleTheme} />
          <button className="icon-button" onClick={toggle} aria-label={enabled ? t("audioOff") : t("audioOn")} title={enabled ? t("audioOff") : t("audioOn")}>
            {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>
      <TurnHeader game={room.game} playerNumber={playerNumber} serverOffset={room.serverTime - Date.now()} />
      <div className="game-stage">
        <PuzzleBoard game={room.game} canMove={canMove} isWatching={isWatching} playerNumber={playerNumber} onMove={move} onWait={waitNotice} />
        <PuzzleReference puzzleId={room.game.puzzleId} layout={room.game.layout} />
      </div>
      <div className="game-meta">
        <span>{t("youPlayer", { number: playerNumber })}</span>
        <span>{t(moveCountKey, { count: room.game.moveCount })}</span>
        <span>{t("roomMeta", { code: room.code })}</span>
      </div>
      {notice && <div className="notice-pill" role="status">{notice}</div>}
      {disconnectedFriend && (
        <div className="modal-backdrop">
          <section className="disconnect-card" role="dialog" aria-modal="true">
            <span className="pause-icon" aria-hidden="true">Ⅱ</span>
            <h2>{t("friendDisconnected")}</h2>
            <p>{t("pausedForThirty")}</p>
            <button className="button button-secondary" onClick={onHome}>{t("backHome")}</button>
          </section>
        </div>
      )}
      {chat.incomingVoiceInvite && (
        <VoiceInvite
          chatOpen={chatOpen}
          onAccept={() => {
            setChatOpen(true);
            void chat.startVoice();
          }}
          onDismiss={chat.dismissVoiceInvite}
        />
      )}      <GameChat
        open={chatOpen}
        playerNumber={playerNumber}
        messages={chat.messages}
        channelReady={chat.channelReady}
        voiceStatus={chat.voiceStatus}
        muted={chat.muted}
        remoteStream={chat.remoteStream}
        voiceTransport={chat.voiceTransport}
        relayPacketsReceived={chat.relayPacketsReceived}
        onClose={() => setChatOpen(false)}
        onSend={chat.sendMessage}
        onStartVoice={chat.startVoice}
        onLeaveVoice={chat.leaveVoice}
        onToggleMute={chat.toggleMute}
      />
      {room.game.phase === "completed" && showCompletion && (
        <CompletionModal
          elapsedMs={room.game.elapsedMs}
          moves={room.game.moveCount}
          rematchReady={player?.rematchReady ?? false}
          completionReason={room.game.completionReason}
          onRematch={onRematch}
          onHome={onHome}
        />
      )}
    </main>
  );
}
