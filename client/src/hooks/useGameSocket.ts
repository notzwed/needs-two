import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ActionResult,
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from "@needs-two/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useGameSocket(sessionId: string) {
  const socketRef = useRef<GameSocket | null>(null);
  const roomCodeRef = useRef(localStorage.getItem("needs-two-room"));
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, { reconnection: true });
    socketRef.current = socket;
    const updateState = (state: RoomState) => {
      roomCodeRef.current = state.code;
      localStorage.setItem("needs-two-room", state.code);
      setRoom(state);
    };
    const stateEvents: Array<keyof ServerToClientEvents> = [
      "room-created", "room-joined", "player-joined", "game-started",
      "state-updated", "turn-changed", "game-completed", "player-disconnected",
    ];
    stateEvents.forEach((event) => socket.on(event, updateState));
    socket.on("connect", () => {
      setConnected(true);
      if (roomCodeRef.current) {
        socket.emit("join-room", { code: roomCodeRef.current, sessionId }, (result) => {
          if (result.ok && result.state) updateState(result.state);
          else {
            localStorage.removeItem("needs-two-room");
            roomCodeRef.current = null;
          }
        });
      }
    });
    socket.on("disconnect", () => setConnected(false));
    return () => {
      stateEvents.forEach((event) => socket.off(event, updateState));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const emitWithReply = useCallback(<T extends "create-room" | "join-room" | "move-tile" | "request-rematch">(
    event: T,
    payload: Parameters<ClientToServerEvents[T]>[0],
  ): Promise<ActionResult> => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket) return resolve({ ok: false, message: "Connessione non disponibile." });
    // Socket.IO's overloads cannot preserve a union of event-specific payloads here.
    (socket.emit as (...args: unknown[]) => void)(event, payload, (result: ActionResult) => {
      if (result.ok && result.state) setRoom(result.state);
      resolve(result);
    });
  }), []);

  const createRoom = useCallback(() => emitWithReply("create-room", { sessionId }), [emitWithReply, sessionId]);
  const joinRoom = useCallback((code: string) => emitWithReply("join-room", { code, sessionId }), [emitWithReply, sessionId]);
  const moveTile = useCallback((tileId: number) => room
    ? emitWithReply("move-tile", { code: room.code, sessionId, tileId })
    : Promise.resolve({ ok: false, message: "Stanza non disponibile." }), [emitWithReply, room, sessionId]);
  const requestRematch = useCallback(() => room
    ? emitWithReply("request-rematch", { code: room.code, sessionId })
    : Promise.resolve({ ok: false, message: "Stanza non disponibile." }), [emitWithReply, room, sessionId]);
  const leaveRoom = useCallback(() => {
    if (room) socketRef.current?.emit("leave-room", { code: room.code, sessionId });
    roomCodeRef.current = null;
    localStorage.removeItem("needs-two-room");
    setRoom(null);
  }, [room, sessionId]);

  return { room, connected, createRoom, joinRoom, moveTile, requestRematch, leaveRoom };
}

