import { useEffect, useState } from "react";
import { TURN_DURATION_MS, type GameState, type PlayerNumber } from "@needs-two/shared";

interface TurnHeaderProps {
  game: GameState;
  playerNumber: PlayerNumber;
  serverOffset: number;
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TurnHeader({ game, playerNumber, serverOffset }: TurnHeaderProps) {
  const [now, setNow] = useState(Date.now() + serverOffset);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      setNow(Date.now() + serverOffset);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [serverOffset]);

  const isMine = game.activePlayer === playerNumber;
  const remaining = game.phase === "transition"
    ? TURN_DURATION_MS
    : game.turnEndsAt ? Math.max(0, game.turnEndsAt - now) : TURN_DURATION_MS;
  const progress = Math.min(100, (remaining / TURN_DURATION_MS) * 100);
  const timerText = formatTimer(remaining);

  return (
    <header className={`turn-header player-${game.activePlayer}`}>
      <span key={`${game.activePlayer}-${game.phase}`} className="turn-label">{isMine ? "Il tuo turno" : "Turno del tuo amico"}</span>
      <strong className="timer" aria-label={`${timerText} rimasti`}>{timerText}</strong>
      <div className="timer-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </header>
  );
}