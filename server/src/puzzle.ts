import { BOARD_SIZE, type GameState, type PuzzleTile } from "@needs-two/shared";

export const PUZZLE_IDS = [
  "cottage", "red-panda", "pond", "mountain-lake", "seaside-cove",
  "autumn-forest", "snowy-village", "desert-oasis", "flower-field",
  "waterfall", "balloon-valley", "lighthouse", "mushroom-forest",
  "sleepy-fox", "cozy-cat", "happy-corgi", "river-otters",
  "garden-bunny", "hedgehog-picnic", "pond-frog", "penguin-pair",
  "ocean-whale", "sea-turtle", "secret-garden", "apple-orchard",
  "sunflower-day", "tropical-island", "koi-garden", "cozy-camp",
  "rainbow-valley", "little-bakery", "treehouse", "sailboat-bay",
] as const;

export function areAdjacent(first: number, second: number, size = BOARD_SIZE): boolean {
  const firstRow = Math.floor(first / size);
  const secondRow = Math.floor(second / size);
  const firstColumn = first % size;
  const secondColumn = second % size;
  return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn) === 1;
}

export function createSolvedBoard(size = BOARD_SIZE): PuzzleTile[] {
  return Array.from({ length: size * size - 1 }, (_, id) => ({
    id,
    correctPosition: id,
    position: id,
  }));
}

function validTilePositions(emptyPosition: number, size: number): number[] {
  return Array.from({ length: size * size }, (_, position) => position).filter((position) =>
    areAdjacent(position, emptyPosition, size),
  );
}

function disorderScore(board: PuzzleTile[], size: number): number {
  return board.reduce((score, tile) => {
    const rowDistance = Math.abs(Math.floor(tile.position / size) - Math.floor(tile.correctPosition / size));
    const columnDistance = Math.abs((tile.position % size) - (tile.correctPosition % size));
    return score + rowDistance + columnDistance;
  }, 0);
}

export function createShuffledPuzzle(
  size = BOARD_SIZE,
  random: () => number = Math.random,
): Pick<GameState, "board" | "emptyPosition"> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const board = createSolvedBoard(size);
    let emptyPosition = size * size - 1;
    let previousEmpty = -1;
    const moves = 140 + Math.floor(random() * 50);

    for (let move = 0; move < moves; move += 1) {
      const candidates = validTilePositions(emptyPosition, size).filter(
        (position) => position !== previousEmpty,
      );
      const chosenPosition = candidates[Math.floor(random() * candidates.length)]!;
      const tile = board.find((candidate) => candidate.position === chosenPosition)!;
      previousEmpty = emptyPosition;
      tile.position = emptyPosition;
      emptyPosition = chosenPosition;
    }

    if (disorderScore(board, size) >= size * 6) {
      return { board, emptyPosition };
    }
  }

  return createShuffledPuzzle(size, Math.random);
}

export function moveTile(game: GameState, tileId: number): boolean {
  const tile = game.board.find((candidate) => candidate.id === tileId);
  if (!tile || !areAdjacent(tile.position, game.emptyPosition, game.size)) return false;
  const previousPosition = tile.position;
  tile.position = game.emptyPosition;
  game.emptyPosition = previousPosition;
  game.moveCount += 1;
  return true;
}

export function isSolved(board: PuzzleTile[]): boolean {
  return board.every((tile) => tile.position === tile.correctPosition);
}

