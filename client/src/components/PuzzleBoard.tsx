import { useMemo, useState } from "react";
import {
  puzzleCellGeometry,
  type GameState,
  type PlayerNumber,
} from "@needs-two/shared";
import { areAdjacentClient } from "../puzzleLogic";
import { t } from "../i18n";
import { puzzleImageUrl } from "../puzzleAssets";
import { Mascot } from "./Mascot";
import { TurnChangePill } from "./TurnChangePill";

interface PuzzleBoardProps {
  game: GameState;
  canMove: boolean;
  isWatching: boolean;
  playerNumber: PlayerNumber;
  onMove: (tileId: number) => Promise<boolean>;
  onWait: () => void;
}

function backgroundPosition(offset: number, cellSize: number) {
  const remaining = 100 - cellSize;
  return remaining <= 0 ? 0 : (offset / remaining) * 100;
}

export function PuzzleBoard({ game, canMove, isWatching, playerNumber, onMove, onWait }: PuzzleBoardProps) {
  const [inputLocked, setInputLocked] = useState(false);
  const image = puzzleImageUrl(game.puzzleId);
  const movable = useMemo(() => new Set(game.board
    .filter((tile) => areAdjacentClient(tile.position, game.emptyPosition, game.layout))
    .map((tile) => tile.id)), [game.board, game.emptyPosition, game.layout]);

  async function chooseTile(tileId: number) {
    if (game.phase === "transition" || game.phase === "completed") return;
    if (!canMove) return onWait();
    if (inputLocked || !movable.has(tileId)) return;
    setInputLocked(true);
    await onMove(tileId);
    window.setTimeout(() => setInputLocked(false), 310);
  }

  const emptyGeometry = puzzleCellGeometry(game.emptyPosition, game.layout);
  const puzzleSolved = game.phase === "completed" && game.completionReason === "solved";
  const shellClasses = [
    "puzzle-shell",
    "layout-" + game.layout,
    game.phase === "transition" ? "changing-turn" : "",
    puzzleSolved ? "is-completing" : "",
    isWatching ? "is-watching" : "",
  ].filter(Boolean).join(" ");
  const boardClasses = [
    "puzzle-board",
    "layout-" + game.layout,
    puzzleSolved ? "is-complete" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClasses}>
      <div
        key={game.puzzleId}
        className={boardClasses}
        aria-label={t("slidingPuzzle", { rows: game.rows, columns: game.columns })}
        data-layout={game.layout}
        data-cell-count={game.board.length + 1}
      >
        <div
          className="empty-space"
          style={{
            "--left": emptyGeometry.left + "%",
            "--top": emptyGeometry.top + "%",
            "--cell-width": emptyGeometry.width + "%",
            "--cell-height": emptyGeometry.height + "%",
          } as React.CSSProperties}
        />
        {game.board.map((tile) => {
          const geometry = puzzleCellGeometry(tile.position, game.layout);
          const correct = puzzleCellGeometry(tile.correctPosition, game.layout);
          const isMovable = movable.has(tile.id);
          return (
            <button
              key={tile.id}
              className={"puzzle-tile " + (isMovable && canMove ? "is-movable" : "")}
              style={{
                "--left": geometry.left + "%",
                "--top": geometry.top + "%",
                "--cell-width": geometry.width + "%",
                "--cell-height": geometry.height + "%",
                "--tile-index": tile.correctPosition,
                backgroundImage: "url(" + image + ")",
                backgroundPosition: backgroundPosition(correct.left, correct.width) + "% " + backgroundPosition(correct.top, correct.height) + "%",
                backgroundSize: (10000 / correct.width) + "% " + (10000 / correct.height) + "%",
              } as React.CSSProperties}
              onClick={() => void chooseTile(tile.id)}
              aria-label={isMovable ? t("moveTile") : t("tileNotMovable")}
              aria-disabled={canMove ? !isMovable || inputLocked : false}
            />
          );
        })}
        <div className="completion-image" style={{ backgroundImage: "url(" + image + ")" }} aria-hidden="true" />
      </div>
      {game.phase === "transition" && <TurnChangePill activePlayer={game.activePlayer} playerNumber={playerNumber} />}
      <div className="friend-turn-mask" aria-hidden={!isWatching}>
        <div className="friend-turn-card">
          <Mascot player={game.activePlayer} />
          <span>{t("friendPlaying")}</span>
          <span className="waiting-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
    </div>
  );
}
