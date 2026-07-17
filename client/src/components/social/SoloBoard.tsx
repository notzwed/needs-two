import { useMemo, useState } from "react";
import type { PuzzleTile } from "@needs-two/shared";
import { puzzleImageUrl } from "../../puzzleAssets";

function adjacent(a: number, b: number, size: number) {
  return Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;
}
function backgroundPosition(index: number, size: number) {
  return size <= 1 ? 0 : index * 100 / (size - 1);
}

export function SoloBoard({ tiles, size, emptyPosition, puzzleId, disabled, completed, onMove }: {
  tiles: PuzzleTile[]; size: number; emptyPosition: number; puzzleId: string; disabled: boolean; completed: boolean;
  onMove: (tileId: number) => Promise<boolean>;
}) {
  const [locked, setLocked] = useState(false);
  const movable = useMemo(() => new Set(tiles.filter((tile) => adjacent(tile.position, emptyPosition, size)).map((tile) => tile.id)), [emptyPosition, size, tiles]);
  async function choose(tileId: number) {
    if (disabled || locked || !movable.has(tileId)) return;
    setLocked(true); await onMove(tileId); window.setTimeout(() => setLocked(false), 280);
  }
  const image = puzzleImageUrl(puzzleId);
  const cell = 100 / size;
  return (
    <div className={"solo-puzzle-shell " + (completed ? "is-completing" : "")}>
      <div className={"puzzle-board solo-puzzle-board " + (completed ? "is-complete" : "")}
        style={{ "--solo-size": size } as React.CSSProperties} aria-label={size + " by " + size + " sliding puzzle"}>
        <div className="empty-space" style={{ "--left": (emptyPosition % size) * cell + "%", "--top": Math.floor(emptyPosition / size) * cell + "%",
          "--cell-width": cell + "%", "--cell-height": cell + "%" } as React.CSSProperties} />
        {tiles.map((tile) => {
          const column = tile.correctPosition % size;
          const row = Math.floor(tile.correctPosition / size);
          return <button key={tile.id} className={"puzzle-tile " + (movable.has(tile.id) && !disabled ? "is-movable" : "")}
            style={{ "--left": (tile.position % size) * cell + "%", "--top": Math.floor(tile.position / size) * cell + "%",
              "--cell-width": cell + "%", "--cell-height": cell + "%", backgroundImage: "url(" + image + ")",
              backgroundPosition: backgroundPosition(column, size) + "% " + backgroundPosition(row, size) + "%",
              backgroundSize: size * 100 + "% " + size * 100 + "%" } as React.CSSProperties}
            onClick={() => void choose(tile.id)} disabled={disabled} aria-label="Move tile" />;
        })}
        <div className="completion-image" style={{ backgroundImage: "url(" + image + ")" }} />
      </div>
    </div>
  );
}
