import { afterEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { GAME_DURATION_MS, TURN_DURATION_MS } from "@needs-two/shared";
import type {
  ActionResult,
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from "@needs-two/shared";
import { createNeedsTwoServer } from "../src/app.js";
import { RoomManager } from "../src/roomManager.js";
import { areAdjacent } from "../src/puzzle.js";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const clients: ClientSocket[] = [];
const servers: Array<ReturnType<typeof createNeedsTwoServer>> = [];

afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function onceConnected(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function waitForState(socket: ClientSocket, predicate: (state: RoomState) => boolean, timeout = 2_000): Promise<RoomState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("state-updated", listener);
      reject(new Error("Timed out waiting for state"));
    }, timeout);
    const listener = (state: RoomState) => {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off("state-updated", listener);
      resolve(state);
    };
    socket.on("state-updated", listener);
  });
}

function emitWithReply(
  socket: ClientSocket,
  event: "create-room" | "join-room" | "move-tile",
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  return new Promise((resolve) => {
    (socket.emit as (...args: unknown[]) => void)(event, payload, resolve);
  });
}

describe("authoritative multiplayer server", () => {
  it("synchronizes two clients, rejects out-of-turn moves, and rotates the turn", async () => {
    const server = createNeedsTwoServer({ turnDurationMs: 240, transitionMs: 60 });
    servers.push(server);
    const port = await server.listen(0);
    const first = createClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
    const second = createClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
    clients.push(first, second);
    await Promise.all([onceConnected(first), onceConnected(second)]);

    const created = await emitWithReply(first, "create-room", { sessionId: "player-one" });
    expect(created.ok).toBe(true);
    const code = created.state!.code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const firstPlaying = waitForState(first, (state) => state.game.phase === "playing");
    const secondPlaying = waitForState(second, (state) => state.game.phase === "playing");
    const joined = await emitWithReply(second, "join-room", { code: code.toLowerCase(), sessionId: "player-two" });
    expect(joined.ok).toBe(true);
    const [firstState, secondState] = await Promise.all([firstPlaying, secondPlaying]);
    expect(firstState.game.board).toEqual(secondState.game.board);
    expect(firstState.game.activePlayer).toBe(1);

    const tile = firstState.game.board.find((candidate) =>
      areAdjacent(candidate.position, firstState.game.emptyPosition, firstState.game.size),
    )!;
    const rejected = await emitWithReply(second, "move-tile", { code, sessionId: "player-two", tileId: tile.id });
    expect(rejected.ok).toBe(false);
    expect(rejected.message).toMatch(/turno/i);

    const synchronizedMove = waitForState(second, (state) => state.game.moveCount === 1);
    const accepted = await emitWithReply(first, "move-tile", { code, sessionId: "player-one", tileId: tile.id });
    expect(accepted.ok).toBe(true);
    const mirroredState = await synchronizedMove;
    expect(mirroredState.game.board).toEqual(accepted.state!.game.board);
    expect(mirroredState.game.emptyPosition).toBe(accepted.state!.game.emptyPosition);

    const secondTurn = await waitForState(first, (state) => state.game.phase === "playing" && state.game.activePlayer === 2);
    expect(secondTurn.game.turnEndsAt).not.toBeNull();
  });
  it("keeps seven-second turns inside a seven-minute game", () => {
    const rooms = new RoomManager({ transitionMs: 800 });
    const created = rooms.createRoom("one", "socket-one");
    const starting = rooms.joinRoom(created.code, "two", "socket-two");
    const transitionAt = starting.game.transitionEndsAt!;
    rooms.tick(transitionAt);
    const game = rooms.getRoom(created.code)!.game;

    expect(game.turnEndsAt! - game.startedAt!).toBe(TURN_DURATION_MS);
    expect(game.gameEndsAt! - game.startedAt!).toBe(GAME_DURATION_MS);

    const completed = rooms.tick(game.gameEndsAt!)[0];
    expect(completed?.event).toBe("game-completed");
    expect(completed?.state.game.completionReason).toBe("timeout");
    expect(completed?.state.game.elapsedMs).toBe(GAME_DURATION_MS);
  });
});

