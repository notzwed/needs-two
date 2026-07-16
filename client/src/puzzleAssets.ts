export function puzzleImageUrl(puzzleId: string): string {
  const modernAsset = /^(square8|rect|pent|hex)-/.test(puzzleId);
  const extension = modernAsset ? "webp" : "png";
  return import.meta.env.BASE_URL + "puzzles/" + puzzleId + "." + extension;
}
