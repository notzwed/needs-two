import type { DifficultyKey, PuzzleTile, ReputationAward } from "@needs-two/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

export interface SoloGameState {
  id: string;
  matchId: string;
  difficulty: DifficultyKey;
  puzzleId: string;
  boardSize: number;
  tiles: Array<{ tileId: number; correctPosition: number; currentPosition: number }>;
  emptyPosition: number;
  moveCount: number;
  phase: "playing" | "paused" | "completed" | "cancelled";
  completionReason: "solved" | "timeout" | "cancelled" | null;
  elapsedMs: number;
  serverTime: number;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Partita Solo non disponibile.";
}

export function useSoloGame(sessionId: string, nightMode: boolean) {
  const [game, setGame] = useState<SoloGameState | null>(null);
  const [reward, setReward] = useState<ReputationAward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<SoloGameState | null>(null);

  const apply = useCallback((next: SoloGameState) => {
    gameRef.current = next;
    setGame(next);
    if (next.phase === "completed" && next.completionReason === "solved" && supabase) {
      void supabase.rpc("needs_two_solo_reward", { p_game_id: next.id }).then(({ data }) => {
        if (data) setReward(data as ReputationAward);
      });
    }
  }, []);

  const start = useCallback(async (difficulty: DifficultyKey, puzzleId: string | null) => {
    if (!supabase) return false;
    setReward(null); setError(null);
    const { data, error: rpcError } = await supabase.rpc("needs_two_start_solo", {
      p_session_id: sessionId, p_difficulty: difficulty, p_puzzle_id: puzzleId, p_dark_mode: nightMode,
    });
    if (rpcError) { setError(rpcError.message); return false; }
    apply(data as SoloGameState);
    return true;
  }, [apply, nightMode, sessionId]);

  const move = useCallback(async (tileId: number) => {
    const current = gameRef.current;
    if (!supabase || !current) return false;
    const { data, error: rpcError } = await supabase.rpc("needs_two_move_solo", {
      p_game_id: current.id, p_session_id: sessionId, p_tile_id: tileId,
    });
    if (rpcError) { setError(message(rpcError)); return false; }
    apply(data as SoloGameState);
    return true;
  }, [apply, sessionId]);

  const pause = useCallback(async (shouldPause: boolean) => {
    const current = gameRef.current;
    if (!supabase || !current) return;
    const { data, error: rpcError } = await supabase.rpc("needs_two_pause_solo", {
      p_game_id: current.id, p_session_id: sessionId, p_pause: shouldPause,
    });
    if (!rpcError) apply(data as SoloGameState);
  }, [apply, sessionId]);

  const cancel = useCallback(async () => {
    const current = gameRef.current;
    gameRef.current = null; setGame(null); setReward(null);
    if (supabase && current && !["completed", "cancelled"].includes(current.phase)) {
      await supabase.rpc("needs_two_cancel_solo", { p_game_id: current.id, p_session_id: sessionId });
    }
  }, [sessionId]);

  useEffect(() => {
    const client = supabase;
    if (!game || !client || game.phase !== "playing") return;
    const timer = window.setInterval(async () => {
      const current = gameRef.current;
      if (!current) return;
      const { data, error: rpcError } = await client.rpc("needs_two_get_solo", { p_game_id: current.id, p_session_id: sessionId });
      if (!rpcError) apply(data as SoloGameState);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [apply, game?.id, game?.phase, sessionId]);

  const board: PuzzleTile[] = game?.tiles.map((tile) => ({ id: tile.tileId, correctPosition: tile.correctPosition, position: tile.currentPosition })) ?? [];
  return { game, board, reward, error, start, move, pause, cancel };
}
