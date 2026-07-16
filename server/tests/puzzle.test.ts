import { describe, expect, it } from "vitest";
import { BOARD_SIZE, puzzleLayoutConfig, type PuzzleLayout } from "@needs-two/shared";
import { areAdjacent, createShuffledPuzzle, isSolved, moveTile } from "../src/puzzle.js";

function isSolvable(boardPositions: number[], emptyPosition: number): boolean {
  const flattened = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, position) => {
    const tileIndex = boardPositions.findIndex((tilePosition) => tilePosition === position);
    return tileIndex === -1 ? 0 : tileIndex + 1;
  });
  const values = flattened.filter(Boolean);
  let inversions = 0;
  for (let first = 0; first < values.length; first += 1) {
    for (let second = first + 1; second < values.length; second += 1) {
      if (values[first]! > values[second]!) inversions += 1;
    }
  }
  const blankRowFromBottom = BOARD_SIZE - Math.floor(emptyPosition / BOARD_SIZE);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

describe("puzzle logic", () => {
  it("generates solvable, meaningfully shuffled boards", () => {
    for (let sample = 0; sample < 250; sample += 1) {
      const puzzle = createShuffledPuzzle();
      expect(isSolved(puzzle.board)).toBe(false);
      expect(isSolvable(puzzle.board.map((tile) => tile.position), puzzle.emptyPosition)).toBe(true);
      const displaced = puzzle.board.filter((tile) => tile.position !== tile.correctPosition);
      expect(displaced.length).toBeGreaterThanOrEqual(8);
    }
  });

  it.each(["square8", "rectangle", "pentagon", "hexagon"] as PuzzleLayout[])(
    "builds a solvable shuffled %s layout",
    (layout) => {
      const config = puzzleLayoutConfig(layout);
      for (let sample = 0; sample < 30; sample += 1) {
        const puzzle = createShuffledPuzzle(layout);
        const positions = [...puzzle.board.map((tile) => tile.position), puzzle.emptyPosition];
        expect(puzzle.board).toHaveLength(config.cellCount - 1);
        expect(new Set(positions).size).toBe(config.cellCount);
        expect(Math.min(...positions)).toBe(0);
        expect(Math.max(...positions)).toBe(config.cellCount - 1);
        expect(isSolved(puzzle.board)).toBe(false);
      }
    },
  );
  it("moves only a tile adjacent to the empty space", () => {
    const puzzle = createShuffledPuzzle();
    const game = {
      size: BOARD_SIZE,
      layout: "square4" as const,
      rows: BOARD_SIZE,
      columns: BOARD_SIZE,
      ...puzzle,
      activePlayer: 1 as const,
      phase: "playing" as const,
      puzzleId: "pond",
      moveCount: 0,
      startedAt: Date.now(),
      completedAt: null,
      gameEndsAt: Date.now() + 7 * 60_000,
      turnEndsAt: Date.now() + 7_000,
      transitionEndsAt: null,
      completionReason: null,
      elapsedMs: 0,
    };
    const adjacent = game.board.find((tile) => areAdjacent(tile.position, game.emptyPosition))!;
    const previousEmpty = game.emptyPosition;
    expect(moveTile(game, adjacent.id)).toBe(true);
    expect(adjacent.position).toBe(previousEmpty);
    const distant = game.board.find((tile) => !areAdjacent(tile.position, game.emptyPosition))!;
    expect(moveTile(game, distant.id)).toBe(false);
  });
});

