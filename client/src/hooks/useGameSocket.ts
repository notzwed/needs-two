import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResult, RoomState } from "@needs-two/shared";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ROOM_STORAGE_KEY = "needs-two-room";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 8 } },
    })
  : null;

type RoomRpc =
  | "needs_two_create_room"
  | "needs_two_join_room"
  | "needs_two_get_room"
  | "needs_two_advance_room"
  | "needs_two_move_tile"
  | "needs_two_request_rematch"
  | "needs_two_leave_room";

interface AdvanceResult {
  state: RoomState;
  changed: boolean;
}

function errorMessage(message: string): string {
  const clean = message.split(" CONTEXT:")[0]?.trim() || message;
  if (clean.includes("Failed to fetch") || clean.includes("NetworkError")) {
    return "Connessione non disponibile. Riprova tra poco.";
  }
  return clean;
}

export function useGameSocket(sessionId: string) {
  const roomRef = useRef<RoomState | null>(null);
  const roomCodeRef = useRef(localStorage.getItem(ROOM_STORAGE_KEY));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const advanceInFlight = useRef(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(Boolean(supabase));

  const applyState = useCallback((state: RoomState) => {
    const current = roomRef.current;
    if (current?.code === state.code && current.serverTime > state.serverTime) return;
    roomRef.current = state;
    roomCodeRef.current = state.code;
    localStorage.setItem(ROOM_STORAGE_KEY, state.code);
    setRoom(state);
  }, []);

  const callRpc = useCallback(async <T,>(name: RoomRpc, args: Record<string, unknown>): Promise<T> => {
    if (!supabase) {
      throw new Error("Supabase non e configurato. Controlla le variabili VITE_SUPABASE_*.");
    }
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw new Error(errorMessage(error.message));
    return data as T;
  }, []);

  const broadcastRefresh = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: "broadcast", event: "refresh", payload: {} });
  }, []);

  const refreshRoom = useCallback(async () => {
    const code = roomCodeRef.current;
    if (!code) return;
    try {
      const state = await callRpc<RoomState>("needs_two_get_room", {
        p_code: code,
        p_session_id: sessionId,
      });
      applyState(state);
      setConnected(true);
    } catch {
      // A transient refresh failure is retried by the heartbeat.
    }
  }, [applyState, callRpc, sessionId]);

  const advanceRoom = useCallback(async () => {
    const code = roomCodeRef.current;
    if (!code || advanceInFlight.current) return;
    advanceInFlight.current = true;
    try {
      const result = await callRpc<AdvanceResult>("needs_two_advance_room", {
        p_code: code,
        p_session_id: sessionId,
      });
      applyState(result.state);
      setConnected(true);
      if (result.changed) await broadcastRefresh();
    } catch {
      setConnected(false);
    } finally {
      advanceInFlight.current = false;
    }
  }, [applyState, broadcastRefresh, callRpc, sessionId]);

  useEffect(() => {
    const savedCode = roomCodeRef.current;
    if (!savedCode || !supabase) return;
    void callRpc<RoomState>("needs_two_join_room", {
      p_code: savedCode,
      p_session_id: sessionId,
    }).then(applyState).catch(() => {
      roomCodeRef.current = null;
      localStorage.removeItem(ROOM_STORAGE_KEY);
    });
  }, [applyState, callRpc, sessionId]);

  useEffect(() => {
    const code = room?.code;
    if (!code || !supabase) return;

    const channel = supabase
      .channel(`needs-two:${code}`)
      .on("broadcast", { event: "refresh" }, () => void refreshRoom())
      .subscribe((status) => {
        const ready = status === "SUBSCRIBED";
        setConnected(ready);
        if (ready) {
          void refreshRoom();
          void channel.send({ type: "broadcast", event: "refresh", payload: {} });
        }
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [refreshRoom, room?.code]);

  useEffect(() => {
    if (!room?.code) return;
    const interval = window.setInterval(() => void advanceRoom(), 5_000);
    const resume = () => {
      if (document.visibilityState === "visible") void advanceRoom();
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [advanceRoom, room?.code]);

  useEffect(() => {
    if (!room) return;
    const target = room.game.phase === "playing"
      ? room.game.turnEndsAt
      : ["starting", "transition"].includes(room.game.phase)
        ? room.game.transitionEndsAt
        : null;
    if (target === null) return;
    const timer = window.setTimeout(() => void advanceRoom(), Math.max(60, target - room.serverTime + 80));
    return () => window.clearTimeout(timer);
  }, [advanceRoom, room]);

  const createRoom = useCallback(async (): Promise<ActionResult> => {
    try {
      const state = await callRpc<RoomState>("needs_two_create_room", { p_session_id: sessionId });
      applyState(state);
      return { ok: true, state };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Non riesco a creare la stanza." };
    }
  }, [applyState, callRpc, sessionId]);

  const joinRoom = useCallback(async (code: string): Promise<ActionResult> => {
    try {
      const state = await callRpc<RoomState>("needs_two_join_room", {
        p_code: code.trim().toUpperCase(),
        p_session_id: sessionId,
      });
      applyState(state);
      return { ok: true, state };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Non riesco a entrare nella stanza." };
    }
  }, [applyState, callRpc, sessionId]);

  const moveTile = useCallback(async (tileId: number): Promise<ActionResult> => {
    const code = roomCodeRef.current;
    if (!code) return { ok: false, message: "Stanza non disponibile." };
    try {
      const state = await callRpc<RoomState>("needs_two_move_tile", {
        p_code: code,
        p_session_id: sessionId,
        p_tile_id: tileId,
      });
      applyState(state);
      await broadcastRefresh();
      return { ok: true, state };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "La mossa non e riuscita." };
    }
  }, [applyState, broadcastRefresh, callRpc, sessionId]);

  const requestRematch = useCallback(async (): Promise<ActionResult> => {
    const code = roomCodeRef.current;
    if (!code) return { ok: false, message: "Stanza non disponibile." };
    try {
      const state = await callRpc<RoomState>("needs_two_request_rematch", {
        p_code: code,
        p_session_id: sessionId,
      });
      applyState(state);
      await broadcastRefresh();
      return { ok: true, state };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Non riesco a riavviare la partita." };
    }
  }, [applyState, broadcastRefresh, callRpc, sessionId]);

  const leaveRoom = useCallback(() => {
    const code = roomCodeRef.current;
    roomCodeRef.current = null;
    roomRef.current = null;
    localStorage.removeItem(ROOM_STORAGE_KEY);
    setRoom(null);
    if (!code) return;
    void callRpc<void>("needs_two_leave_room", {
      p_code: code,
      p_session_id: sessionId,
    }).then(() => broadcastRefresh()).catch(() => undefined);
  }, [broadcastRefresh, callRpc, sessionId]);

  return { room, connected, createRoom, joinRoom, moveTile, requestRematch, leaveRoom };
}
