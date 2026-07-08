import { describe, expect, it } from "vitest";

import { formatScoreErrorMessage, GAME_KEYS, mapScoreRow } from "./scores";

describe("score row mapping", () => {
  it("maps Supabase score rows into leaderboard entries with game keys", () => {
    expect(
      mapScoreRow({
        score_id: "score-1",
        score_game_key: "make-ten",
        score_player_id: "student-a",
        score_correct_count: 18,
        score_total_questions: 20,
        score_duration_seconds: 93,
        score_created_at: "2026-06-30T00:00:00.000Z",
      }),
    ).toEqual({
      id: "score-1",
      gameKey: "make-ten",
      playerId: "student-a",
      score: 18,
      totalQuestions: 20,
      durationSeconds: 93,
      createdAt: "2026-06-30T00:00:00.000Z",
    });
  });

  it("explains when the multi-game score migration is missing", () => {
    expect(formatScoreErrorMessage("column scores.score_game_key does not exist")).toBe(
      "排行榜数据库还未升级，请先执行 supabase/migrations/20260630_multi_game_scores.sql。",
    );
  });

  it("explains when the summer homework game key migration is missing", () => {
    expect(formatScoreErrorMessage("violates check constraint scores_score_game_key_check")).toBe(
      "排行榜数据库还未支持最新小游戏，请先按顺序执行 supabase/migrations/20260630_summer_homework_games.sql 和 supabase/migrations/20260702_first_grade_strategy_games.sql。",
    );
  });

  it("includes all deployed game keys", () => {
    expect(GAME_KEYS).toEqual([
      "arithmetic",
      "make-ten",
      "place-value",
      "compare",
      "column-arithmetic",
      "multiplication-groups",
      "times-table",
      "make-ten-strategy",
      "break-ten-strategy",
      "balance-ten-strategy",
    ]);
  });
});
