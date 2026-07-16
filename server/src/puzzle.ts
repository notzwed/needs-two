import {
  BOARD_SIZE,
  arePuzzlePositionsAdjacent,
  puzzleLayoutConfig,
  type GameState,
  type PuzzleLayout,
  type PuzzleTile,
} from "@needs-two/shared";

export const PUZZLE_IDS = [
  "cottage", "red-panda", "pond", "mountain-lake", "seaside-cove",
  "autumn-forest", "snowy-village", "desert-oasis", "flower-field",
  "waterfall", "balloon-valley", "lighthouse", "mushroom-forest",
  "sleepy-fox", "cozy-cat", "happy-corgi", "river-otters",
  "garden-bunny", "hedgehog-picnic", "pond-frog", "penguin-pair",
  "ocean-whale", "sea-turtle", "secret-garden", "apple-orchard",
  "sunflower-day", "tropical-island", "koi-garden", "cozy-camp",
  "rainbow-valley", "little-bakery", "treehouse", "sailboat-bay",
  "square8-01", "square8-02", "square8-03", "square8-04", "square8-05",
  "square8-06", "square8-07", "square8-08", "square8-09", "square8-10",
  "rect-01", "rect-02", "rect-03", "rect-04", "rect-05",
  "rect-06", "rect-07", "rect-08", "rect-09", "rect-10",
] as const;

export function areAdjacent(first: number, second: number, size = BOARD_SIZE): boolean {
  return Math.abs(Math.floor(first / size) - Math.floor(second / size))
    + Math.abs((first % size) - (second % size)) === 1;
}

export function createSolvedBoard(cellCount = BOARD_SIZE * BOARD_SIZE): PuzzleTile[] {
  return Array.from({ length: cellCount - 1 }, (_, id) => ({
    id,
    correctPosition: id,
    position: id,
  }));
}

function layoutDetails(layoutOrSize: PuzzleLayout | number) {
  if (typeof layoutOrSize === "number") {
    return {
      cellCount: layoutOrSize * layoutOrSize,
      adjacent: (first: number, second: number) => areAdjacent(first, second, layoutOrSize),
      shuffleMoves: Math.max(180, layoutOrSize * layoutOrSize * 12),
    };
  }
  const config = puzzleLayoutConfig(layoutOrSize);
  const shuffleMoves = layoutOrSize === "square8" ? 1_100 : Math.max(220, config.cellCount * 15);
  return {
    cellCount: config.cellCount,
    adjacent: (first: number, second: number) => arePuzzlePositionsAdjacent(first, second, layoutOrSize),
    shuffleMoves,
  };
}

export function createShuffledPuzzle(
  layoutOrSize: PuzzleLayout | number = BOARD_SIZE,
  random: () => number = Math.random,
): Pick<GameState, "board" | "emptyPosition"> {
  const { cellCount, adjacent, shuffleMoves } = layoutDetails(layoutOrSize);
  let fallback: Pick<GameState, "board" | "emptyPosition"> | null = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const board = createSolvedBoard(cellCount);
    let emptyPosition = cellCount - 1;
    let previousEmpty = -1;

    for (let move = 0; move < shuffleMoves; move += 1) {
      const candidates = Array.from({ length: cellCount }, (_, position) => position)
        .filter((position) => position !== previousEmpty && adjacent(position, emptyPosition));
      const chosenPosition = candidates[Math.floor(random() * candidates.length)]!;
      const tile = board.find((candidate) => candidate.position === chosenPosition)!;
      previousEmpty = emptyPosition;
      tile.position = emptyPosition;
      emptyPosition = chosenPosition;
    }

    fallback = { board, emptyPosition };
    const displaced = board.filter((tile) => tile.position !== tile.correctPosition).length;
    if (displaced >= Math.min(cellCount - 2, Math.max(8, Math.floor(cellCount * 0.45)))) {
      return fallback;
    }
  }

  return fallback!;
}

export function moveTile(game: GameState, tileId: number): boolean {
  const tile = game.board.find((candidate) => candidate.id === tileId);
  if (!tile || !arePuzzlePositionsAdjacent(tile.position, game.emptyPosition, game.layout)) return false;
  const previousPosition = tile.position;
  tile.position = game.emptyPosition;
  game.emptyPosition = previousPosition;
  game.moveCount += 1;
  return true;
}

export function isSolved(board: PuzzleTile[]): boolean {
  return board.every((tile) => tile.position === tile.correctPosition);
}
