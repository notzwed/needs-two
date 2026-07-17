export type MatchMode = "solo" | "friend" | "random";
export type DifficultyKey = "easy" | "normal" | "hard" | "expert";

export interface ReputationLevel {
  key: string;
  name: string;
  minRep: number;
}

export const REPUTATION_LEVELS: ReputationLevel[] = [
  { key: "beginner", name: "Beginner", minRep: 0 },
  { key: "solver", name: "Solver", minRep: 100 },
  { key: "partner", name: "Partner", minRep: 300 },
  { key: "linker", name: "Linker", minRep: 700 },
  { key: "master-pair", name: "Master Pair", minRep: 1500 },
  { key: "twofold", name: "Twofold", minRep: 3000 },
];

export interface DifficultyConfig {
  key: DifficultyKey;
  label: string;
  size: number;
  baseRep: number;
  veryFastMs: number;
  fastMs: number;
  averageMs: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { key: "easy", label: "Easy", size: 3, baseRep: 10, veryFastMs: 45_000, fastMs: 75_000, averageMs: 120_000 },
  { key: "normal", label: "Normal", size: 4, baseRep: 18, veryFastMs: 90_000, fastMs: 150_000, averageMs: 240_000 },
  { key: "hard", label: "Hard", size: 5, baseRep: 28, veryFastMs: 180_000, fastMs: 300_000, averageMs: 420_000 },
  { key: "expert", label: "Expert", size: 6, baseRep: 40, veryFastMs: 270_000, fastMs: 420_000, averageMs: 600_000 },
];

export const MATCHMAKING_RULES = {
  heartbeatMs: 4_000,
  staleAfterMs: 12_000,
  ranges: [
    { afterMs: 0, repRange: 150 },
    { afterMs: 20_000, repRange: 400 },
    { afterMs: 35_000, repRange: null },
  ],
} as const;

export const NICKNAME_COLORS = [
  { key: "sage", value: "#427765" },
  { key: "coral", value: "#b8584f" },
  { key: "powder", value: "#4e7188" },
  { key: "sun", value: "#916919" },
  { key: "lilac", value: "#705d8c" },
  { key: "peach", value: "#a85f44" },
  { key: "night", value: "#293c50" },
  { key: "cocoa", value: "#655047" },
] as const;

export const NICKNAME_FONTS = ["Nunito", "Quicksand", "DM Sans", "Fredoka", "Baloo 2", "Manrope"] as const;

export const AVATARS = [
  { key: "cozy-cat", puzzleId: "cozy-cat", label: "Cozy Cat" },
  { key: "red-panda", puzzleId: "red-panda", label: "Red Panda" },
  { key: "garden-bunny", puzzleId: "garden-bunny", label: "Garden Bunny" },
  { key: "sleepy-fox", puzzleId: "sleepy-fox", label: "Sleepy Fox" },
  { key: "happy-corgi", puzzleId: "happy-corgi", label: "Happy Corgi" },
  { key: "pond-frog", puzzleId: "pond-frog", label: "Pond Frog" },
  { key: "penguin-pair", puzzleId: "penguin-pair", label: "Penguin Pair" },
  { key: "ocean-whale", puzzleId: "ocean-whale", label: "Ocean Whale" },
  { key: "sea-turtle", puzzleId: "sea-turtle", label: "Sea Turtle" },
  { key: "hedgehog", puzzleId: "hedgehog-picnic", label: "Hedgehog" },
  { key: "river-otters", puzzleId: "river-otters", label: "River Otters" },
  { key: "koi-garden", puzzleId: "koi-garden", label: "Koi Garden" },
] as const;

export type PixelPattern = readonly string[];
export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  requirement: string;
  goal: number;
  palette: readonly [string, string, string];
  pattern: PixelPattern;
}

const patterns: Record<string, PixelPattern> = {
  piece: ["........","..111...","..1222..","111222..","122222..","12222...","..222...","........"],
  pair: ["........",".11..22.", "111.222.", "1112222.", ".11222..", "..122...", "...2....","........"],
  bolt: ["...11...","..112...","..122...","..222...","..221...","..211...","...1....","........"],
  dice: [".111111.","11222211","12112121","12222221","12112121","11222211",".111111.","........"],
  mind: ["..1111..",".122221.","12211221","12222221",".122221.","..1221..","..1111..","........"],
  star: ["...1....","...1....",".11211..","..122...","..222...","..2.2...","........","........"],
  crown: [".1....1.","121..121","12211221","12222221",".122221.","..1111..","........","........"],
  check: ["........","......1.",".....12.","..1.122.","..21122.","...122..","....2...","........"],
  moon: ["...111..","..122...","..12....","..12....","..122...","...111..","........","........"],
  heart: ["........",".11..11.","12211221","12222221",".122221.","..1222..","...2....","........"],
  link: ["........","..111..."," .12221..","..1.21..","..12.1..","..12221.","...111..","........"].map((row)=>row.replace(" ","")),
  master: ["..1..1..",".121121.","12222221",".122221.","..1222..",".112211.","..1..1..","........"],
};

export const BADGES: BadgeDefinition[] = [
  { key: "first-piece", name: "First Piece", description: "Il primo puzzle completato.", requirement: "Completa il tuo primo puzzle", goal: 1, palette: ["#2f5148","#79b7a6","#d8efe8"], pattern: patterns.piece },
  { key: "perfect-pair", name: "Perfect Pair", description: "Una coppia che sa coordinarsi.", requirement: "Completa 10 puzzle con amici", goal: 10, palette: ["#744942","#e88978","#ffe0d8"], pattern: patterns.pair },
  { key: "speedy-solver", name: "Speedy Solver", description: "Risoluzione particolarmente rapida.", requirement: "Completa entro la soglia veloce", goal: 1, palette: ["#75591c","#e8b84f","#fff0b5"], pattern: patterns.bolt },
  { key: "random-friend", name: "Random Friend", description: "Nuove intese nate nel matchmaking.", requirement: "Completa 5 partite casuali", goal: 5, palette: ["#3d5d72","#79a8c2","#dceef5"], pattern: patterns.dice },
  { key: "solo-mind", name: "Solo Mind", description: "Concentrazione in modalità Solo.", requirement: "Completa 10 puzzle Solo", goal: 10, palette: ["#605477","#9c8bbb","#ece5f5"], pattern: patterns.mind },
  { key: "hundred-club", name: "Hundred Club", description: "Il viaggio REP è iniziato.", requirement: "Raggiungi 100 REP", goal: 100, palette: ["#4d6541","#8db579","#e6f2dd"], pattern: patterns.star },
  { key: "thousand-club", name: "Thousand Club", description: "Un traguardo importante.", requirement: "Raggiungi 1000 REP", goal: 1000, palette: ["#72551d","#d8a83f","#fff0bd"], pattern: patterns.crown },
  { key: "no-mistakes", name: "No Mistakes", description: "Un percorso quasi perfetto.", requirement: "Completa con pochissime mosse extra", goal: 1, palette: ["#335f58","#6fb6a8","#d9f1ec"], pattern: patterns.check },
  { key: "night-solver", name: "Night Solver", description: "Puzzle completato nella quiete notturna.", requirement: "Completa un puzzle in modalità scura", goal: 1, palette: ["#3c4666","#7180ae","#dce2fa"], pattern: patterns.moon },
  { key: "comeback", name: "Comeback", description: "Calma anche negli ultimi secondi.", requirement: "Supera più turni sotto i 2 secondi e completa", goal: 1, palette: ["#80483f","#d97a68","#ffe0d7"], pattern: patterns.heart },
  { key: "loyal-partner", name: "Loyal Partner", description: "Una collaborazione che ritorna.", requirement: "Completa 5 partite con lo stesso amico", goal: 5, palette: ["#3f6571","#73a9b7","#deeff2"], pattern: patterns.link },
  { key: "puzzle-master", name: "Puzzle Master", description: "Ogni difficoltà è stata affrontata.", requirement: "Completa tutte le difficoltà", goal: 4, palette: ["#614c74","#a58abd","#f0e4f6"], pattern: patterns.master },
];

export interface PlayerStats {
  gamesPlayed: number;
  gamesCompleted: number;
  puzzlesCompleted: number;
  soloCompleted: number;
  friendCompleted: number;
  randomCompleted: number;
  victories: number;
  losses: number;
  totalPlayMs: number;
  averageTimeMs: number | null;
  bestTimeMs: number | null;
  totalMoves: number;
  averageMoves: number | null;
  abandons: number;
  completionStreak: number;
  bestCompletionStreak: number;
  repEarned: number;
}

export interface ProfileBadge {
  key: string;
  name: string;
  description: string;
  requirement: string;
  target: number;
  sortOrder: number;
  palette: string;
  unlockedAt: number | null;
  progress: number;
}

export interface PublicProfile {
  id: string;
  nickname: string;
  avatarKey: string;
  avatarUrl: string | null;
  nicknameColor: string;
  nicknameFont: string;
  rep: number;
  level: ReputationLevel & { nextMinRep: number | null; progress: number; progressMax: number | null };
  featuredBadge: string | null;
  displayedBadges: string[];
  createdAt: number;
  stats: PlayerStats;
  badges: ProfileBadge[];
  recentMatches: Array<{ id: string; mode: MatchMode; difficulty: DifficultyKey; puzzleId: string; completed: boolean; elapsedMs: number; moves: number; completedAt: number | null; rep: number }>;
}

export interface RepBreakdown {
  base?: number;
  speedBonus?: number;
  speedPercent?: number;
  collaborationBonus?: number;
  modeMultiplier?: number;
  farmMultiplier?: number;
  total?: number;
  badgesUnlocked?: string[];
}

export interface ReputationAward {
  matchId: string;
  earned: number;
  totalRep: number;
  breakdown: RepBreakdown;
  level: PublicProfile["level"];
}

export interface ReputationInput {
  difficulty: DifficultyKey;
  elapsedMs: number;
  mode: MatchMode;
  collaborationEligible: boolean;
  repeatCount: number;
  solved: boolean;
  abandoned: boolean;
}

export function reputationLevel(rep: number) {
  let index = 0;
  REPUTATION_LEVELS.forEach((level, levelIndex) => { if (rep >= level.minRep) index = levelIndex; });
  const current = REPUTATION_LEVELS[index];
  const next = REPUTATION_LEVELS[index + 1] ?? null;
  return { ...current, nextMinRep: next?.minRep ?? null, progress: rep - current.minRep, progressMax: next ? next.minRep - current.minRep : null };
}

export function calculateReputation(input: ReputationInput) {
  if (!input.solved || input.abandoned) return { total: 0, base: 0, speedBonus: 0, collaborationBonus: 0, modeMultiplier: 0, farmMultiplier: 0 };
  const difficulty = DIFFICULTIES.find((item) => item.key === input.difficulty) ?? DIFFICULTIES[1];
  const speedPercent = input.elapsedMs <= difficulty.veryFastMs ? 30 : input.elapsedMs <= difficulty.fastMs ? 20 : input.elapsedMs <= difficulty.averageMs ? 10 : 0;
  const speedBonus = Math.round(difficulty.baseRep * speedPercent / 100);
  const collaborationBonus = input.collaborationEligible && input.mode !== "solo" ? Math.max(1, Math.round(difficulty.baseRep * 0.1)) : 0;
  const modeMultiplier = input.mode === "solo" ? 0.8 : input.mode === "random" ? 1.15 : 1;
  const farmMultiplier = input.repeatCount >= 3 ? 0.25 : 1;
  return {
    base: difficulty.baseRep,
    speedBonus,
    collaborationBonus,
    modeMultiplier,
    farmMultiplier,
    total: Math.max(1, Math.round((difficulty.baseRep + speedBonus + collaborationBonus) * modeMultiplier * farmMultiplier)),
  };
}

export function matchmakingRange(waitMs: number): number | null {
  if (waitMs >= 35_000) return null;
  if (waitMs >= 20_000) return 400;
  return 150;
}

export function validateNickname(value: string): string | null {
  const nickname = value.trim().replace(/\s+/g, " ");
  if (nickname.length < 3 || nickname.length > 16) return "length";
  if (!/[\p{L}\p{N}]/u.test(nickname) || /[<>/\\\u0000-\u001f]/u.test(nickname)) return "characters";
  const blocked = ["fuck", "shit", "bitch", "cazzo", "merda", "stronzo", "nazist"];
  if (blocked.some((word) => nickname.toLocaleLowerCase().includes(word))) return "blocked";
  return null;
}

export function createSolvableBoard(size: number, moves = size * size * 12, random: () => number = Math.random) {
  if (!Number.isInteger(size) || size < 3 || size > 8) throw new Error("invalid board size");
  const total = size * size;
  const board = Array.from({ length: total - 1 }, (_, index) => index);
  let emptyPosition = total - 1;
  let previousEmpty = -1;
  for (let step = 0; step < moves; step += 1) {
    const candidates = Array.from({ length: total }, (_, position) => position).filter((position) =>
      Math.abs(Math.floor(position / size) - Math.floor(emptyPosition / size))
        + Math.abs(position % size - emptyPosition % size) === 1 && position !== previousEmpty);
    const chosen = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    const tileIndex = board.indexOf(chosen);
    previousEmpty = emptyPosition;
    board[tileIndex] = emptyPosition;
    emptyPosition = chosen;
  }
  return { board, emptyPosition };
}
