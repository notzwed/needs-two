import { createServer, type Server as HttpServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@needs-two/shared";
import { RoomManager, type RoomManagerOptions } from "./roomManager.js";

interface SocketData {
  roomCode?: string;
  sessionId?: string;
}

export interface NeedsTwoServerOptions extends RoomManagerOptions {
  port?: number;
  clientOrigin?: string;
}

export function createNeedsTwoServer(options: NeedsTwoServerOptions = {}) {
  const app = express();
  app.use(cors({ origin: options.clientOrigin ?? "http://localhost:5173" }));
  app.get("/health", (_request, response) => response.json({ ok: true }));
  const httpServer: HttpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: options.clientOrigin ?? "http://localhost:5173" },
  });
  const rooms = new RoomManager(options);

  io.on("connection", (socket) => {
    socket.on("create-room", ({ sessionId }, reply) => {
      try {
        const state = rooms.createRoom(sessionId, socket.id);
        socket.join(state.code);
        socket.data = { roomCode: state.code, sessionId };
        socket.emit("room-created", state);
        reply({ ok: true, state });
      } catch (error) {
        reply({ ok: false, message: error instanceof Error ? error.message : "Impossibile creare la stanza." });
      }
    });

    socket.on("join-room", ({ code, sessionId }, reply) => {
      try {
        const state = rooms.joinRoom(code, sessionId, socket.id);
        socket.join(state.code);
        socket.data = { roomCode: state.code, sessionId };
        socket.emit("room-joined", state);
        socket.to(state.code).emit("player-joined", state);
        io.to(state.code).emit("state-updated", state);
        reply({ ok: true, state });
      } catch (error) {
        reply({ ok: false, message: error instanceof Error ? error.message : "Non riesco a entrare nella stanza." });
      }
    });

    socket.on("move-tile", ({ code, sessionId, tileId }, reply) => {
      try {
        const state = rooms.requestMove(code, sessionId, tileId);
        io.to(state.code).emit("state-updated", state);
        if (state.game.phase === "completed") io.to(state.code).emit("game-completed", state);
        reply({ ok: true, state });
      } catch (error) {
        reply({ ok: false, message: error instanceof Error ? error.message : "Mossa non valida." });
      }
    });

    socket.on("request-rematch", ({ code, sessionId }, reply) => {
      try {
        const state = rooms.requestRematch(code, sessionId);
        io.to(state.code).emit("state-updated", state);
        reply({ ok: true, state });
      } catch (error) {
        reply({ ok: false, message: error instanceof Error ? error.message : "Non riesco ad avviare la rivincita." });
      }
    });

    socket.on("leave-room", ({ code, sessionId }) => {
      rooms.leave(code, sessionId);
      socket.leave(code.toUpperCase());
      socket.data = {};
    });

    socket.on("disconnect", () => {
      const update = rooms.disconnect(socket.id);
      if (update) io.to(update.code).emit("player-disconnected", update.state);
    });
  });

  const ticker = setInterval(() => {
    for (const update of rooms.tick()) {
      io.to(update.code).emit(update.event, update.state);
      io.to(update.code).emit("state-updated", update.state);
    }
  }, 50);
  ticker.unref();

  return {
    app,
    io,
    rooms,
    httpServer,
    async listen(port = options.port ?? 3001): Promise<number> {
      await new Promise<void>((resolve) => httpServer.listen(port, resolve));
      const address = httpServer.address();
      if (!address || typeof address === "string") throw new Error("Server address unavailable");
      return address.port;
    },
    async close(): Promise<void> {
      clearInterval(ticker);
      io.close();
      if (httpServer.listening) await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

