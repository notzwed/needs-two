import {
  BOARD_SIZE,
  TURN_DURATION_MS,
  TURN_TRANSITION_MS,
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
  phase: GamePhase;
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
  transitionMs?: number;
  random?: () => number;
}

export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
  readonly turnDurationMs: number;
  readonly transitionMs: number;
  private readonly random: () => number;

  constructor(options: RoomManagerOptions = {}) {
    this.turnDurationMs = options.turnDurationMs ?? TURN_DURATION_MS;
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
    if (room.game.activePlayer !== player.number) throw new Error("Aspetta il tuo turno.");
    if (!moveTile(room.game, tileId)) throw new Error("Questo tassello non può muoversi.");

    if (isSolved(room.game.board)) {
      const now = Date.now();
      room.game.phase = "completed";
      room.game.completedAt = now;
      room.game.turnEndsAt = null;
      room.game.transitionEndsAt = null;
      room.game.elapsedMs = room.game.startedAt ? now - room.game.startedAt : 0;
    }
    return this.publicState(room);
  }

  requestRematch(codeInput: string, sessionId: string): RoomState {
    const room = this.requireRoom(codeInput);
    const player = room.players.find((candidate) => candidate.id === sessionId);
    if (!player) throw new Error("Non fai parte di questa stanza.");
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
      if (room.game.phase === "playing" || room.game.phase === "transition" || room.game.phase === "starting") {
        room.pauseSnapshot = {
          phase: room.game.phase,
          remainingTurnMs: room.game.turnEndsAt
            ? Math.max(0, room.game.turnEndsAt - now)
            : this.turnDurationMs,
        };
        room.game.elapsedMs = room.game.startedAt ? now - room.game.startedAt : room.game.elapsedMs;
        room.game.phase = "paused";
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

  tick(now = Date.now()): Array<{ code: string; event: "game-started" | "turn-changed"; state: RoomState }> {
    const updates: Array<{ code: string; event: "game-started" | "turn-changed"; state: RoomState }> = [];
    for (const room of this.rooms.values()) {
      if (room.game.phase === "starting" && room.game.transitionEndsAt && now >= room.game.transitionEndsAt) {
        room.game.phase = "transition";
        room.game.startedAt = now;
        room.game.elapsedMs = 0;
        room.game.transitionEndsAt = now + this.transitionMs;
        room.game.turnEndsAt = now + this.transitionMs + this.turnDurationMs;
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

  private startGame(room: ManagedRoom): void {
    room.game = this.newGame("starting");
    room.game.transitionEndsAt = Date.now() + 1_000;
  }

  private resumeIfReady(room: ManagedRoom): void {
    if (room.players.length !== 2 || !room.players.every((player) => player.connected) || room.game.phase !== "paused") return;
    const now = Date.now();
    const remaining = room.pauseSnapshot?.remainingTurnMs ?? this.turnDurationMs;
    if (room.game.startedAt) room.game.startedAt = now - room.game.elapsedMs;
    room.game.phase = "transition";
    room.game.transitionEndsAt = now + this.transitionMs;
    room.game.turnEndsAt = now + this.transitionMs + Math.max(350, remaining);
    room.pauseSnapshot = null;
  }

  private newGame(phase: GamePhase, previousPuzzle?: string): GameState {
    const choices = PUZZLE_IDS.filter((id) => id !== previousPuzzle);
    const puzzleId = choices[Math.floor(this.random() * choices.length)] ?? PUZZLE_IDS[0];
    const shuffled = createShuffledPuzzle(BOARD_SIZE, this.random);
    return {
      size: BOARD_SIZE,
      ...shuffled,
      activePlayer: 1,
      phase,
      puzzleId,
      moveCount: 0,
      startedAt: null,
      completedAt: null,
      turnEndsAt: null,
      transitionEndsAt: null,
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
          : room.game.startedAt ? serverTime - room.game.startedAt : 0,
      },
      serverTime,
    };
  }

  private generateCode(): string {
    return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)]).join("");
  }
}

