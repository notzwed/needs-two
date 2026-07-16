import { useEffect, useState } from "react";
import {
  GAME_DURATION_MS,
  TURN_DURATION_MS,
  type GameState,
  type PlayerNumber,
} from "@needs-two/shared";
import { t } from "../i18n";

interface TurnHeaderProps {
  game: GameState;
  playerNumber: PlayerNumber;
  serverOffset: number;
}

function formatGameTimer(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTurnTimer(milliseconds: number) {
  return (Math.max(0, milliseconds) / 1_000).toFixed(1);
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
  const turnRemaining = game.phase === "transition"
    ? TURN_DURATION_MS
    : game.turnEndsAt ? Math.max(0, game.turnEndsAt - now) : TURN_DURATION_MS;
  const gameRemaining = game.gameEndsAt
    ? Math.min(GAME_DURATION_MS, Math.max(0, game.gameEndsAt - now))
    : Math.max(0, GAME_DURATION_MS - game.elapsedMs);
  const progress = Math.min(100, (turnRemaining / TURN_DURATION_MS) * 100);
  const turnText = formatTurnTimer(turnRemaining);
  const gameText = formatGameTimer(gameRemaining);

  return (
    <header className={`turn-header player-${game.activePlayer}`}>
      <div className="game-clock" aria-label={t("gameTimeRemaining", { time: gameText })}>
        <span>{t("gameTime")}</span><strong className="game-timer">{gameText}</strong>
      </div>
      <span key={`${game.activePlayer}-${game.phase}`} className="turn-label">{isMine ? t("yourTurn") : t("friendTurn")}</span>
      <strong className="timer" aria-label={t("turnSecondsRemaining", { time: turnText })}>{turnText}</strong>
      <div className="timer-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </header>
  );
}
