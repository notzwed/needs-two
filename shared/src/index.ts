export const BOARD_SIZE = 4;
export const TURN_DURATION_MS = 10_000;
export const GAME_DURATION_MS = 10 * 60 * 1_000;
export const TURN_TRANSITION_MS = 800;

export type PuzzleLayout = "square4" | "square8" | "rectangle";

export interface PuzzleLayoutConfig {
  layout: PuzzleLayout;
  rows: number;
  columns: number;
  cellCount: number;
}

export function puzzleLayoutFromId(puzzleId: string): PuzzleLayout {
  if (puzzleId.startsWith("square8-")) return "square8";
  if (puzzleId.startsWith("rect-")) return "rectangle";
  return "square4";
}

export function puzzleLayoutConfig(layout: PuzzleLayout): PuzzleLayoutConfig {
  if (layout === "square8") return { layout, rows: 8, columns: 8, cellCount: 64 };
  if (layout === "rectangle") return { layout, rows: 4, columns: 5, cellCount: 20 };
  return { layout, rows: 4, columns: 4, cellCount: 16 };
}

export function arePuzzlePositionsAdjacent(first: number, second: number, layout: PuzzleLayout): boolean {
  const { columns } = puzzleLayoutConfig(layout);
  return Math.abs(Math.floor(first / columns) - Math.floor(second / columns))
    + Math.abs((first % columns) - (second % columns)) === 1;
}

export function puzzleCellGeometry(position: number, layout: PuzzleLayout) {
  const config = puzzleLayoutConfig(layout);
  const width = 100 / config.columns;
  const height = 100 / config.rows;
  return {
    left: (position % config.columns) * width,
    top: Math.floor(position / config.columns) * height,
    width,
    height,
  };
}
export type PlayerNumber = 1 | 2;
export type CompletionReason = "solved" | "timeout" | null;
export type GamePhase =
  | "waiting"
  | "starting"
  | "transition"
  | "playing"
  | "paused"
  | "completed";

export interface Player {
  id: string;
  number: PlayerNumber;
  connected: boolean;
  rematchReady: boolean;
}

export interface PuzzleTile {
  id: number;
  correctPosition: number;
  position: number;
}

export interface GameState {
  size: number;
  layout: PuzzleLayout;
  rows: number;
  columns: number;
  board: PuzzleTile[];
  emptyPosition: number;
  activePlayer: PlayerNumber;
  phase: GamePhase;
  puzzleId: string;
  moveCount: number;
  startedAt: number | null;
  completedAt: number | null;
  gameEndsAt: number | null;
  turnEndsAt: number | null;
  transitionEndsAt: number | null;
  completionReason: CompletionReason;
  elapsedMs: number;
}

export interface RoomState {
  code: string;
  players: Player[];
  game: GameState;
  serverTime: number;
}

export interface RoomRequest {
  sessionId: string;
}

export interface JoinRoomRequest extends RoomRequest {
  code: string;
}

export interface MoveTileRequest extends JoinRoomRequest {
  tileId: number;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  state?: RoomState;
}

export interface ClientToServerEvents {
  "create-room": (request: RoomRequest, reply: (result: ActionResult) => void) => void;
  "join-room": (request: JoinRoomRequest, reply: (result: ActionResult) => void) => void;
  "move-tile": (request: MoveTileRequest, reply: (result: ActionResult) => void) => void;
  "request-rematch": (request: JoinRoomRequest, reply: (result: ActionResult) => void) => void;
  "leave-room": (request: JoinRoomRequest) => void;
}

export interface ServerToClientEvents {
  "room-created": (state: RoomState) => void;
  "room-joined": (state: RoomState) => void;
  "player-joined": (state: RoomState) => void;
  "game-started": (state: RoomState) => void;
  "state-updated": (state: RoomState) => void;
  "turn-changed": (state: RoomState) => void;
  "game-completed": (state: RoomState) => void;
  "player-disconnected": (state: RoomState) => void;
  "room-error": (message: string) => void;
}

export interface SocketEvents {
  clientToServer: ClientToServerEvents;
  serverToClient: ServerToClientEvents;
}

export * from './social.js';
