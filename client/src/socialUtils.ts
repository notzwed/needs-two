import { AVATARS, NICKNAME_COLORS, NICKNAME_FONTS, type PublicProfile } from "@needs-two/shared";

export function avatarUrl(avatarKey: string, customUrl?: string | null) {
  if (customUrl) return customUrl;
  const avatar = AVATARS.find((item) => item.key === avatarKey) ?? AVATARS[0];
  const modern = /^(square8|rect)-/.test(avatar.puzzleId);
  return import.meta.env.BASE_URL + "puzzles/" + avatar.puzzleId + "." + (modern ? "webp" : "png");
}

export function nicknameColor(key: string) {
  const aliases: Record<string, string> = {
    "powder-blue": "#4e7188", "warm-yellow": "#916919", "soft-lilac": "#705d8c",
    "soft-night": "#293c50", "deep-cream": "#655047",
  };
  return aliases[key] ?? NICKNAME_COLORS.find((item) => item.key === key)?.value ?? "#427765";
}

export function nicknameFont(key: string) {
  const aliases: Record<string, string> = {
    nunito: "Nunito", quicksand: "Quicksand", "dm-sans": "DM Sans", fredoka: "Fredoka", "baloo-2": "Baloo 2", manrope: "Manrope",
  };
  const family = aliases[key] ?? NICKNAME_FONTS.find((item) => item.toLocaleLowerCase() === key)?.toString() ?? "Nunito";
  return '"' + family + '", "Nunito", sans-serif';
}

export function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes + ":" + String(seconds % 60).padStart(2, "0");
}

export function completionPercent(profile: PublicProfile) {
  return profile.stats.gamesPlayed ? Math.round(profile.stats.gamesCompleted * 1000 / profile.stats.gamesPlayed) / 10 : 0;
}

export async function prepareAvatarFile(file: File): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("invalid");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, 512, 512);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("encode")), "image/webp", 0.86));
}
