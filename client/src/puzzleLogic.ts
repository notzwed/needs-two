export function areAdjacentClient(first: number, second: number, size: number): boolean {
  return Math.abs(Math.floor(first / size) - Math.floor(second / size))
    + Math.abs((first % size) - (second % size)) === 1;
}

