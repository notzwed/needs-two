export const BOARD_SIZE = 4;
export const TURN_DURATION_MS = 7 * 60 * 1_000;
export const TURN_TRANSITION_MS = 800;

export type PlayerNumber = 1 | 2;
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
  board: PuzzleTile[];
  emptyPosition: number;
  activePlayer: PlayerNumber;
  phase: GamePhase;
  puzzleId: string;
  moveCount: number;
  startedAt: number | null;
  completedAt: number | null;
  turnEndsAt: number | null;
  transitionEndsAt: number | null;
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
