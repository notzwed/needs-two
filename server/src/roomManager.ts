import {
  GAME_DURATION_MS,
  TURN_DURATION_MS,
  TURN_TRANSITION_MS,
  puzzleLayoutConfig,
  puzzleLayoutFromId,
  type GamePhase,
  type GameState,
  type Player,
  type PlayerNumber,
  type RoomState,
} from "@needs-two/shared";
import { createShuffledPuzzle, isSolved, moveTile, PUZZLE_IDS } from "./puzzle.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECONNECT_WINDOW_MS = 30_000;
const EMPTY_ROOM_TTL_MS = 90_000;

interface ManagedPlayer extends Player {
  socketId: string | null;
  disconnectedAt: number | null;
}

interface PauseSnapshot {
  remainingTurnMs: number;
}

interface ManagedRoom {
  code: string;
  players: ManagedPlayer[];
  game: GameState;
  createdAt: number;
  emptySince: number | null;
  pauseSnapshot: PauseSnapshot | null;
}

export interface RoomManagerOptions {
  turnDurationMs?: number;
  gameDurationMs?: number;
  transitionMs?: number;
  random?: () => number;
}

type TickEvent = "game-started" | "turn-changed" | "game-completed";

export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
  readonly turnDurationMs: number;
  readonly gameDurationMs: number;
  readonly transitionMs: number;
  private readonly random: () => number;

  constructor(options: RoomManagerOptions = {}) {
    this.turnDurationMs = options.turnDurationMs ?? TURN_DURATION_MS;
    this.gameDurationMs = options.gameDurationMs ?? GAME_DURATION_MS;
    this.transitionMs = options.transitionMs ?? TURN_TRANSITION_MS;
    this.random = options.random ?? Math.random;
  }

  createRoom(sessionId: string, socketId: string): RoomState {
    let code = this.generateCode();
    while (this.rooms.has(code)) code = this.generateCode();
    const room: ManagedRoom = {
      code,
      players: [this.player(sessionId, socketId, 1)],
      game: this.newGame("waiting"),
      createdAt: Date.now(),
      emptySince: null,
      pauseSnapshot: null,
    };
    this.rooms.set(code, room);
    return this.publicState(room);
  }

  joinRoom(codeInput: string, sessionId: string, socketId: string): RoomState {
    const code = codeInput.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) throw new Error("Questa stanza non esiste più.");

    const returningPlayer = room.players.find((player) => player.id === sessionId);
    if (returningPlayer) {
      returningPlayer.connected = true;
      returningPlayer.socketId = socketId;
      returningPlayer.disconnectedAt = null;
      room.emptySince = null;
      this.resumeIfReady(room);
      return this.publicState(room);
    }

    if (room.players.length >= 2) throw new Error("Questa stanza è già piena.");
    const number: PlayerNumber = room.players.some((player) => player.number === 1) ? 2 : 1;
    room.players.push(this.player(sessionId, socketId, number));
    room.emptySince = null;
    this.startGame(room);
    return this.publicState(room);
  }

  getRoom(code: string): RoomState | null {
    const room = this.rooms.get(code.toUpperCase());
    return room ? this.publicState(room) : null;
  }

  getRoomCodeForSocket(socketId: string): string | null {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) return room.code;
    }
    return null;
  }

  requestMove(codeInput: string, sessionId: string, tileId: number): RoomState {
    const room = this.requireRoom(codeInput);
    const player = room.players.find((candidate) => candidate.id === sessionId && candidate.connected);
    if (!player) throw new Error("Non fai parte di questa stanza.");
    if (room.game.phase !== "playing") throw new Error("Aspetta un momento.");
    if (room.game.gameEndsAt && Date.now() >= room.game.gameEndsAt) throw new Error("Tempo scaduto.");
    if (room.game.activePlayer !== player.number) throw new Error("Aspetta il tuo turno.");
    if (!moveTile(room.game, tileId)) throw new Error("Questo tassello non può muoversi.");

    if (isSolved(room.game.board)) {
      const now = Date.now();
      room.game.phase = "completed";
      room.game.completedAt = now;
      room.game.gameEndsAt = null;
      room.game.turnEndsAt = null;
      room.game.transitionEndsAt = null;
      room.game.completionReason = "solved";
      room.game.elapsedMs = room.game.startedAt ? Math.max(0, now - room.game.startedAt) : 0;
    }
    return this.publicState(room);
  }

  requestRematch(codeInput: string, sessionId: string): RoomState {
    const room = this.requireRoom(codeInput);
    const player = room.players.find((candidate) => candidate.id === sessionId);
    if (!player) throw new Error("Non fai parte di questa stanza.");
    if (room.game.phase !== "completed") throw new Error("La partita non è ancora completata.");
    player.rematchReady = true;
    if (room.players.length === 2 && room.players.every((candidate) => candidate.rematchReady)) {
      room.game = this.newGame("starting", room.game.puzzleId);
      room.players.forEach((candidate) => { candidate.rematchReady = false; });
      room.game.transitionEndsAt = Date.now() + 1_000;
    }
    return this.publicState(room);
  }

  disconnect(socketId: string): { code: string; state: RoomState } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((candidate) => candidate.socketId === socketId);
      if (!player) continue;
      const now = Date.now();
      player.connected = false;
      player.socketId = null;
      player.disconnectedAt = now;
      if (["playing", "transition", "starting"].includes(room.game.phase)) {
        room.pauseSnapshot = {
          remainingTurnMs: room.game.turnEndsAt
            ? Math.max(0, room.game.turnEndsAt - now)
            : this.turnDurationMs,
        };
        room.game.elapsedMs = room.game.startedAt
          ? Math.max(0, Math.min(this.gameDurationMs, now - room.game.startedAt))
          : room.game.elapsedMs;
        room.game.phase = "paused";
        room.game.gameEndsAt = null;
        room.game.turnEndsAt = null;
        room.game.transitionEndsAt = null;
      }
      if (room.players.every((candidate) => !candidate.connected)) room.emptySince = now;
      return { code: room.code, state: this.publicState(room) };
    }
    return null;
  }

  leave(codeInput: string, sessionId: string): void {
    const room = this.rooms.get(codeInput.toUpperCase());
    if (!room) return;
    room.players = room.players.filter((player) => player.id !== sessionId);
    if (room.players.length === 0) this.rooms.delete(room.code);
  }

  tick(now = Date.now()): Array<{ code: string; event: TickEvent; state: RoomState }> {
    const updates: Array<{ code: string; event: TickEvent; state: RoomState }> = [];
    for (const room of this.rooms.values()) {
      if (["playing", "transition"].includes(room.game.phase) && room.game.gameEndsAt && now >= room.game.gameEndsAt) {
        this.completeByTimeout(room, now);
        updates.push({ code: room.code, event: "game-completed", state: this.publicState(room, now) });
      } else if (room.game.phase === "starting" && room.game.transitionEndsAt && now >= room.game.transitionEndsAt) {
        const playingStartsAt = now + this.transitionMs;
        room.game.phase = "transition";
        room.game.startedAt = playingStartsAt;
        room.game.elapsedMs = 0;
        room.game.transitionEndsAt = playingStartsAt;
        room.game.turnEndsAt = playingStartsAt + this.turnDurationMs;
        room.game.gameEndsAt = playingStartsAt + this.gameDurationMs;
        updates.push({ code: room.code, event: "game-started", state: this.publicState(room, now) });
      } else if (room.game.phase === "transition" && room.game.transitionEndsAt && now >= room.game.transitionEndsAt) {
        room.game.phase = "playing";
        room.game.transitionEndsAt = null;
        updates.push({ code: room.code, event: "turn-changed", state: this.publicState(room, now) });
      } else if (room.game.phase === "playing" && room.game.turnEndsAt && now >= room.game.turnEndsAt) {
        room.game.activePlayer = room.game.activePlayer === 1 ? 2 : 1;
        room.game.phase = "transition";
        room.game.transitionEndsAt = now + this.transitionMs;
        room.game.turnEndsAt = now + this.transitionMs + this.turnDurationMs;
        updates.push({ code: room.code, event: "turn-changed", state: this.publicState(room, now) });
      }

      room.players = room.players.filter(
        (player) => player.connected || !player.disconnectedAt || now - player.disconnectedAt < RECONNECT_WINDOW_MS,
      );
      if (room.players.length === 0 && room.emptySince && now - room.emptySince > EMPTY_ROOM_TTL_MS) {
        this.rooms.delete(room.code);
      }
    }
    return updates;
  }

  private completeByTimeout(room: ManagedRoom, now: number): void {
    room.game.phase = "completed";
    room.game.completedAt = now;
    room.game.gameEndsAt = null;
    room.game.turnEndsAt = null;
    room.game.transitionEndsAt = null;
    room.game.completionReason = "timeout";
    room.game.elapsedMs = this.gameDurationMs;
  }

  private startGame(room: ManagedRoom): void {
    room.game = this.newGame("starting");
    room.game.transitionEndsAt = Date.now() + 1_000;
  }

  private resumeIfReady(room: ManagedRoom): void {
    if (room.players.length !== 2 || !room.players.every((player) => player.connected) || room.game.phase !== "paused") return;
    const now = Date.now();
    const playingStartsAt = now + this.transitionMs;
    const remainingTurn = room.pauseSnapshot?.remainingTurnMs ?? this.turnDurationMs;
    room.game.startedAt = playingStartsAt - room.game.elapsedMs;
    room.game.gameEndsAt = playingStartsAt + Math.max(0, this.gameDurationMs - room.game.elapsedMs);
    room.game.phase = "transition";
    room.game.transitionEndsAt = playingStartsAt;
    room.game.turnEndsAt = playingStartsAt + Math.max(350, remainingTurn);
    room.pauseSnapshot = null;
  }

  private newGame(phase: GamePhase, previousPuzzle?: string): GameState {
    const choices = PUZZLE_IDS.filter((id) => id !== previousPuzzle);
    const puzzleId = choices[Math.floor(this.random() * choices.length)] ?? PUZZLE_IDS[0];
    const layout = puzzleLayoutFromId(puzzleId);
    const config = puzzleLayoutConfig(layout);
    const shuffled = createShuffledPuzzle(layout, this.random);
    return {
      size: config.columns,
      layout,
      rows: config.rows,
      columns: config.columns,
      ...shuffled,
      activePlayer: 1,
      phase,
      puzzleId,
      moveCount: 0,
      startedAt: null,
      completedAt: null,
      gameEndsAt: null,
      turnEndsAt: null,
      transitionEndsAt: null,
      completionReason: null,
      elapsedMs: 0,
    };
  }

  private player(id: string, socketId: string, number: PlayerNumber): ManagedPlayer {
    return { id, socketId, number, connected: true, rematchReady: false, disconnectedAt: null };
  }

  private requireRoom(codeInput: string): ManagedRoom {
    const room = this.rooms.get(codeInput.toUpperCase());
    if (!room) throw new Error("Questa stanza non esiste più.");
    return room;
  }

  private publicState(room: ManagedRoom, serverTime = Date.now()): RoomState {
    return {
      code: room.code,
      players: room.players.map(({ id, number, connected, rematchReady }) => ({
        id, number, connected, rematchReady,
      })),
      game: {
        ...room.game,
        board: room.game.board.map((tile) => ({ ...tile })),
        elapsedMs: room.game.phase === "completed" || room.game.phase === "paused"
          ? room.game.elapsedMs
          : room.game.startedAt ? Math.max(0, serverTime - room.game.startedAt) : 0,
      },
      serverTime,
    };
  }

  private generateCode(): string {
    return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)]).join("");
  }
}