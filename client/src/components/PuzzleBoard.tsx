import { useEffect, useMemo, useRef, useState } from "react";
import { areAdjacentClient } from "../puzzleLogic";
import type { GameState } from "@needs-two/shared";

interface PuzzleBoardProps {
  game: GameState;
  canMove: boolean;
  isWatching: boolean;
  onMove: (tileId: number) => Promise<boolean>;
  onWait: () => void;
}

export function PuzzleBoard({ game, canMove, isWatching, onMove, onWait }: PuzzleBoardProps) {
  const [inputLocked, setInputLocked] = useState(false);
  const [movedTileId, setMovedTileId] = useState<number | null>(null);
  const previousPositions = useRef(new Map(game.board.map((tile) => [tile.id, tile.position])));
  const image = `${import.meta.env.BASE_URL}puzzles/${game.puzzleId}.png`;
  const movable = useMemo(() => new Set(game.board
    .filter((tile) => areAdjacentClient(tile.position, game.emptyPosition, game.size))
    .map((tile) => tile.id)), [game.board, game.emptyPosition, game.size]);

  useEffect(() => {
    const moved = game.board.find((tile) => previousPositions.current.get(tile.id) !== tile.position);
    previousPositions.current = new Map(game.board.map((tile) => [tile.id, tile.position]));
    if (!moved) return;
    setMovedTileId(moved.id);
    const timer = window.setTimeout(() => setMovedTileId(null), 280);
    return () => window.clearTimeout(timer);
  }, [game.board]);

  async function chooseTile(tileId: number) {
    if (!canMove) return onWait();
    if (inputLocked || !movable.has(tileId)) return;
    setInputLocked(true);
    await onMove(tileId);
    window.setTimeout(() => setInputLocked(false), 225);
  }

  return (
    <div className={`puzzle-shell ${game.phase === "transition" ? "changing-turn" : ""} ${isWatching ? "is-watching" : ""}`}>
      <div key={game.puzzleId} className={`puzzle-board ${game.phase === "completed" ? "is-complete" : ""}`} aria-label="Puzzle scorrevole 4 per 4">
        <div className="empty-space" style={{ "--col": game.emptyPosition % game.size, "--row": Math.floor(game.emptyPosition / game.size) } as React.CSSProperties} />
        {game.board.map((tile) => {
          const correctColumn = tile.correctPosition % game.size;
          const correctRow = Math.floor(tile.correctPosition / game.size);
          const isMovable = movable.has(tile.id);
          return (
            <button
              key={tile.id}
              className={`puzzle-tile ${isMovable && canMove ? "is-movable" : ""} ${movedTileId === tile.id ? "just-moved" : ""}`}
              style={{
                "--col": tile.position % game.size,
                "--row": Math.floor(tile.position / game.size),
                "--tile-index": tile.correctPosition,
                backgroundImage: `url(${image})`,
                backgroundPosition: `${(correctColumn / (game.size - 1)) * 100}% ${(correctRow / (game.size - 1)) * 100}%`,
                backgroundSize: `${game.size * 100}% ${game.size * 100}%`,
              } as React.CSSProperties}
              onClick={() => void chooseTile(tile.id)}
              aria-label={isMovable ? "Sposta tassello" : "Tassello non spostabile"}
              aria-disabled={canMove ? !isMovable || inputLocked : false}
            />
          );
        })}
        <div className="completion-image" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
      </div>
      <div className="friend-turn-mask" aria-hidden={!isWatching}>
        <span>Sta giocando il tuo amico</span>
      </div>
    </div>
  );
}