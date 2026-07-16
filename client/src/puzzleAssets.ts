export function puzzleImageUrl(puzzleId: string): string {
  const modernAsset = /^(square8|rect)-/.test(puzzleId);
  const extension = modernAsset ? "webp" : "png";
  return import.meta.env.BASE_URL + "puzzles/" + puzzleId + "." + extension;
}
