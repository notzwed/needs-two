import { arePuzzlePositionsAdjacent, type PuzzleLayout } from "@needs-two/shared";

export function areAdjacentClient(first: number, second: number, layout: PuzzleLayout): boolean {
  return arePuzzlePositionsAdjacent(first, second, layout);
}
