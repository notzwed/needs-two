import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AVATARS, BADGES, calculateReputation, createSolvableBoard, matchmakingRange,
  reputationLevel, validateNickname,
} from "@needs-two/shared";

describe("social puzzle rules", () => {
  it("validates registration nicknames and the preset catalog", () => {
    expect(validateNickname("Ma")).toBe("length");
    expect(validateNickname("Marco_Puzzle")).toBeNull();
    expect(validateNickname("<script>")).toBe("characters");
    expect(validateNickname("cazzo123")).toBe("blocked");
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATARS.map((avatar) => avatar.key)).size).toBe(12);
  });

  it("calculates server-mirrored REP formula for each mode", () => {
    const common = { difficulty: "normal" as const, elapsedMs: 80_000, collaborationEligible: true, repeatCount: 0, solved: true, abandoned: false };
    const solo = calculateReputation({ ...common, mode: "solo" });
    const friend = calculateReputation({ ...common, mode: "friend" });
    const random = calculateReputation({ ...common, mode: "random" });
    expect(solo.total).toBeLessThan(friend.total);
    expect(random.total).toBeGreaterThan(friend.total);
    expect(calculateReputation({ ...common, mode: "friend", repeatCount: 3 }).total).toBeLessThan(friend.total);
    expect(calculateReputation({ ...common, mode: "friend", solved: false }).total).toBe(0);
  });

  it("derives reputation levels and progressive matchmaking ranges", () => {
    expect(reputationLevel(0).name).toBe("Beginner");
    expect(reputationLevel(1_500).name).toBe("Master Pair");
    expect(matchmakingRange(0)).toBe(150);
    expect(matchmakingRange(20_000)).toBe(400);
    expect(matchmakingRange(35_000)).toBeNull();
  });

  it("ships twelve unique progressive badges", () => {
    expect(BADGES).toHaveLength(12);
    expect(new Set(BADGES.map((badge) => badge.key)).size).toBe(12);
    expect(BADGES.every((badge) => badge.pattern.length === 8 && badge.pattern.every((row) => row.length === 8))).toBe(true);
  });

  it.each([3, 4, 5, 6])("creates a solvable %sx%s board by legal moves", (size) => {
    let seed = 17;
    const state = createSolvableBoard(size, size * size * 16, () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    });
    expect(state.board).toHaveLength(size * size - 1);
    expect(new Set([...state.board, state.emptyPosition])).toEqual(new Set(Array.from({ length: size * size }, (_, index) => index)));
    const displaced = state.board.filter((position, tile) => position !== tile).length;
    expect(displaced).toBeGreaterThanOrEqual(size);
  });

  it("keeps security, unique rewards, uploads, stats, and matchmaking in migrations", () => {
    const root = resolve(import.meta.dirname, "../..");
    const schema = readFileSync(resolve(root, "supabase/migrations/20260717180000_social_puzzle_platform.sql"), "utf8");
    const rpc = readFileSync(resolve(root, "supabase/migrations/20260717181000_matchmaking_and_solo_rpc.sql"), "utf8");
    expect(schema).toContain("unique (user_id, match_id)");
    expect(schema).toContain("needs_two_user_badges");
    expect(schema).toContain("needs_two_player_stats");
    expect(schema).toContain("needs-two-avatars");
    expect(schema).toContain("auth.uid()");
    expect(rpc).toContain("for update skip locked");
    expect(rpc).toContain("needs_two_move_solo");
    expect(rpc).toContain("abs((v_position/v_game.board_size)");
  });
});
