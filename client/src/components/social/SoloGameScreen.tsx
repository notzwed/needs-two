import { ArrowLeft, Home, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { PuzzleTile, ReputationAward } from "@needs-two/shared";
import type { SoloGameState } from "../../hooks/useSoloGame";
import { s } from "../../socialI18n";
import { formatDuration } from "../../socialUtils";
import { PuzzleReference } from "../PuzzleReference";
import { RepGainSummary } from "./RepGainSummary";
import { SoloBoard } from "./SoloBoard";

export function SoloGameScreen({ game, tiles, reward, soundEnabled, onToggleSound, onMove, onPause, onHome, onAgain }: {
  game: SoloGameState; tiles: PuzzleTile[]; reward: ReputationAward | null; soundEnabled: boolean;
  onToggleSound: () => void; onMove: (tileId: number) => Promise<boolean>; onPause: (pause: boolean) => Promise<void>;
  onHome: () => void; onAgain: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (game.phase !== "playing") return;
    const frame = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(frame);
  }, [game.phase]);
  const elapsed = Math.min(600000, game.elapsedMs + (game.phase === "playing" ? Math.max(0, now - game.serverTime) : 0));
  const remaining = Math.max(0, 600000 - elapsed);
  const complete = game.phase === "completed";
  return (
    <main className="solo-game-screen">
      <header className="solo-game-topbar">
        <button className="icon-button" onClick={onHome} aria-label={s("back")}><Home size={19} /></button>
        <span>Needs Two · {s("soloTitle")}</span>
        <div><button className="icon-button" onClick={() => void onPause(game.phase === "playing")} aria-label={game.phase === "paused" ? s("resume") : s("pause")}>
          {game.phase === "paused" ? <Play size={19} /> : <Pause size={19} />}</button>
          <button className="icon-button" onClick={onToggleSound} aria-label="Audio"><Volume2 size={19} /></button></div>
      </header>
      <section className="solo-game-stats">
        <div><small>{s("time")}</small><strong>{formatDuration(remaining)}</strong><i><i style={{ width: remaining * 100 / 600000 + "%" }} /></i></div>
        <div><small>{s("moves")}</small><strong>{game.moveCount}</strong></div>
        <div><small>{s("difficulty")}</small><strong>{game.difficulty}</strong></div>
      </section>
      <div className="solo-game-layout">
        <SoloBoard tiles={tiles} size={game.boardSize} emptyPosition={game.emptyPosition} puzzleId={game.puzzleId}
          disabled={game.phase !== "playing"} completed={complete && game.completionReason === "solved"} onMove={onMove} />
        <PuzzleReference puzzleId={game.puzzleId} layout="square4" />
      </div>
      {game.phase === "paused" && <div className="solo-pause-mask"><div className="social-card"><Pause size={24} /><h2>{s("pause")}</h2>
        <button className="button button-primary" onClick={() => void onPause(false)}><Play size={18} />{s("resume")}</button></div></div>}
      {complete && <div className="modal-backdrop solo-complete-backdrop"><section className="completion-card social-card">
        <h2>{game.completionReason === "solved" ? "Puzzle completato!" : s("timeUp")}</h2>
        <div className="completion-stats"><div><span>{s("time")}</span><strong>{formatDuration(game.elapsedMs)}</strong></div><div><span>{s("moves")}</span><strong>{game.moveCount}</strong></div></div>
        {reward && <RepGainSummary reward={reward} />}
        <div className="completion-actions"><button className="button button-primary" onClick={onAgain}>{s("start")}</button>
          <button className="button button-secondary" onClick={onHome}><ArrowLeft size={18} />Home</button></div>
      </section></div>}
    </main>
  );
}
