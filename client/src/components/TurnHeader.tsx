import { useEffect, useState } from "react";
import type { GameState, PlayerNumber } from "@needs-two/shared";

interface TurnHeaderProps {
  game: GameState;
  playerNumber: PlayerNumber;
  serverOffset: number;
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
  const remaining = game.turnEndsAt ? Math.max(0, game.turnEndsAt - now) : 7_000;
  const seconds = game.phase === "transition" ? 7 : remaining / 1_000;
  const progress = game.phase === "transition" ? 100 : Math.min(100, (remaining / 7_000) * 100);
  return (
    <header className={`turn-header player-${game.activePlayer}`}>
      <span key={`${game.activePlayer}-${game.phase}`} className="turn-label">{isMine ? "Il tuo turno" : "Turno del tuo amico"}</span>
      <strong className="timer" aria-label={`${seconds.toFixed(1)} secondi rimasti`}>{seconds.toFixed(1)}</strong>
      <div className="timer-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </header>
  );
}

