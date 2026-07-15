import { Home, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlayerNumber, RoomState } from "@needs-two/shared";
import { CompletionModal } from "./CompletionModal";
import { PuzzleBoard } from "./PuzzleBoard";
import { TurnHeader } from "./TurnHeader";
import { useSound } from "../hooks/useSound";

interface GameScreenProps {
  room: RoomState;
  sessionId: string;
  connected: boolean;
  onMove: (tileId: number) => Promise<{ ok: boolean; message?: string }>;
  onRematch: () => void;
  onHome: () => void;
}

export function GameScreen({ room, sessionId, connected, onMove, onRematch, onHome }: GameScreenProps) {
  const player = room.players.find((candidate) => candidate.id === sessionId);
  const playerNumber = (player?.number ?? 1) as PlayerNumber;
  const canMove = connected && room.game.phase === "playing" && room.game.activePlayer === playerNumber;
  const isWatching = connected && ["playing", "transition"].includes(room.game.phase) && room.game.activePlayer !== playerNumber;
  const disconnectedFriend = room.game.phase === "paused" || room.players.some((candidate) => !candidate.connected);
  const [notice, setNotice] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const { enabled, toggle, play } = useSound();
  const previousPhase = useRef(room.game.phase);
  const previousPlayer = useRef(room.game.activePlayer);

  useEffect(() => {
    if (previousPlayer.current !== room.game.activePlayer || (previousPhase.current !== "transition" && room.game.phase === "transition")) play("turn");
    if (previousPhase.current !== "completed" && room.game.phase === "completed") play("complete");
    previousPhase.current = room.game.phase;
    previousPlayer.current = room.game.activePlayer;
  }, [play, room.game.activePlayer, room.game.phase]);

  useEffect(() => {
    if (room.game.phase !== "completed") {
      setShowCompletion(false);
      return;
    }
    const timer = window.setTimeout(() => setShowCompletion(true), 650);
    return () => window.clearTimeout(timer);
  }, [room.game.phase]);

  function waitNotice() {
    if (room.game.phase !== "playing" || room.game.activePlayer !== playerNumber) {
      setNotice("Aspetta il tuo turno");
      window.setTimeout(() => setNotice(""), 1_100);
    }
  }

  async function move(tileId: number) {
    const result = await onMove(tileId);
    if (result.ok) play("move");
    else if (result.message) {
      setNotice(result.message);
      window.setTimeout(() => setNotice(""), 1_100);
    }
    return result.ok;
  }

  return (
    <main className={`game-screen ${isWatching ? "is-watching" : "is-playing"}`}>
      <div className="game-topbar">
        <button className="icon-button" onClick={onHome} aria-label="Torna alla home"><Home size={20} /></button>
        <span className="mini-brand">Needs Two</span>
        <button className="icon-button" onClick={toggle} aria-label={enabled ? "Disattiva audio" : "Attiva audio"}>
          {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
      <TurnHeader game={room.game} playerNumber={playerNumber} serverOffset={room.serverTime - Date.now()} />
      <PuzzleBoard game={room.game} canMove={canMove} isWatching={isWatching} onMove={move} onWait={waitNotice} />
      <div className="game-meta">
        <span>Tu: Player {playerNumber}</span><span>{room.game.moveCount} mosse</span><span>Stanza {room.code}</span>
      </div>
      {room.game.phase === "transition" && (
        <div className={`turn-pill player-${room.game.activePlayer}`} role="status">
          {room.game.activePlayer === playerNumber ? "Tocca a te!" : "Turno del tuo amico"}
        </div>
      )}
      {notice && <div className="notice-pill" role="status">{notice}</div>}
      {disconnectedFriend && (
        <div className="modal-backdrop">
          <section className="disconnect-card" role="dialog" aria-modal="true">
            <span className="pause-icon" aria-hidden="true">Ⅱ</span>
            <h2>Il tuo amico si è disconnesso</h2>
            <p>La partita resta in pausa per 30 secondi.</p>
            <button className="button button-secondary" onClick={onHome}>Torna alla home</button>
          </section>
        </div>
      )}
      {room.game.phase === "completed" && showCompletion && (
        <CompletionModal
          elapsedMs={room.game.elapsedMs}
          moves={room.game.moveCount}
          rematchReady={player?.rematchReady ?? false}
          onRematch={onRematch}
          onHome={onHome}
        />
      )}
    </main>
  );
}
