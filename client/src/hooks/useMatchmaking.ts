import { MATCHMAKING_RULES } from "@needs-two/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

export interface MatchmakingState {
  status: "idle" | "waiting" | "matched" | "error";
  waitSeconds: number;
  range: number | null;
  roomCode: string | null;
  matchId: string | null;
  message: string | null;
}

const initialState: MatchmakingState = { status: "idle", waitSeconds: 0, range: 150, roomCode: null, matchId: null, message: null };

export function useMatchmaking(sessionId: string, nightMode: boolean) {
  const [state, setState] = useState(initialState);
  const activeRef = useRef(false);
  const call = useCallback(async () => {
    if (!supabase || !activeRef.current) return;
    const { data, error } = await supabase.rpc("needs_two_join_matchmaking", {
      p_session_id: sessionId, p_dark_mode: nightMode,
    });
    if (!activeRef.current) return;
    if (error) {
      if (error.message.toLocaleLowerCase().includes("aspetta un momento")) {
        setState((current) => ({ ...current, status: "waiting", message: null }));
        return;
      }
      setState((current) => ({ ...current, status: "error", message: error.message }));
      activeRef.current = false;
      return;
    }
    const next = data as { status: "waiting" | "matched"; waitSeconds?: number; range?: number | null; roomCode?: string; matchId?: string };
    setState({
      status: next.status, waitSeconds: next.waitSeconds ?? 0, range: next.range ?? null,
      roomCode: next.roomCode ?? null, matchId: next.matchId ?? null, message: null,
    });
    if (next.status === "matched") activeRef.current = false;
  }, [nightMode, sessionId]);

  const start = useCallback(() => {
    activeRef.current = true;
    setState({ ...initialState, status: "waiting" });
    void call();
  }, [call]);

  const cancel = useCallback(async () => {
    activeRef.current = false;
    setState(initialState);
    await supabase?.rpc("needs_two_leave_matchmaking", { p_session_id: sessionId });
  }, [sessionId]);

  useEffect(() => {
    if (state.status !== "waiting") return;
    const timer = window.setInterval(() => void call(), MATCHMAKING_RULES.heartbeatMs);
    const visual = window.setInterval(() => setState((current) => current.status === "waiting"
      ? { ...current, waitSeconds: current.waitSeconds + 1 } : current), 1000);
    return () => { window.clearInterval(timer); window.clearInterval(visual); };
  }, [call, state.status]);

  useEffect(() => () => {
    if (activeRef.current) void supabase?.rpc("needs_two_leave_matchmaking", { p_session_id: sessionId });
  }, [sessionId]);

  return { state, start, cancel };
}
