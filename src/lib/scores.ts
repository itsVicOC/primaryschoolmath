import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const GAME_KEYS = [
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
] as const;

export type GameKey = (typeof GAME_KEYS)[number];

export function isGameKey(value: string): value is GameKey {
  return GAME_KEYS.includes(value as GameKey);
}

export interface LeaderboardEntry {
  id: string;
  gameKey: GameKey;
  playerId: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAt: string;
}

export interface ScoreInput {
  gameKey: GameKey;
  playerId: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  message?: string;
}

const SUPABASE_MISSING_MESSAGE = "未配置 Supabase，排行榜暂不可用。";
const SCORE_SCHEMA_MISSING_MESSAGE =
  "排行榜数据库还未升级，请先执行 supabase/migrations/20260630_multi_game_scores.sql。";
const SCORE_GAME_KEY_MISSING_MESSAGE =
  "排行榜数据库还未支持最新小游戏，请先按顺序执行 supabase/migrations/20260630_summer_homework_games.sql 和 supabase/migrations/20260702_first_grade_strategy_games.sql。";

export interface ScoreRow {
  score_id: string;
  score_game_key: GameKey;
  score_player_id: string;
  score_correct_count: number;
  score_total_questions: number;
  score_duration_seconds: number;
  score_created_at: string;
}

export function mapScoreRow(row: ScoreRow): LeaderboardEntry {
  return {
    id: row.score_id,
    gameKey: row.score_game_key,
    playerId: row.score_player_id,
    score: row.score_correct_count,
    totalQuestions: row.score_total_questions,
    durationSeconds: row.score_duration_seconds,
    createdAt: row.score_created_at,
  };
}

export function formatScoreErrorMessage(message: string): string {
  if (message.includes("scores_score_game_key_check")) {
    return SCORE_GAME_KEY_MISSING_MESSAGE;
  }

  if (message.includes("score_game_key")) {
    return SCORE_SCHEMA_MISSING_MESSAGE;
  }

  return message;
}

export async function fetchLeaderboard(
  gameKey: GameKey,
  limit = 10,
): Promise<LeaderboardResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { entries: [], message: SUPABASE_MISSING_MESSAGE };
  }

  const { data, error } = await supabase
    .from("scores")
    .select(
      "score_id, score_game_key, score_player_id, score_correct_count, score_total_questions, score_duration_seconds, score_created_at",
    )
    .eq("score_game_key", gameKey)
    .order("score_correct_count", { ascending: false })
    .order("score_duration_seconds", { ascending: true })
    .order("score_created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { entries: [], message: formatScoreErrorMessage(error.message) };
  }

  return { entries: ((data ?? []) as ScoreRow[]).map(mapScoreRow) };
}

export async function submitScore(input: ScoreInput): Promise<{ message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { message: SUPABASE_MISSING_MESSAGE };
  }

  const { error } = await supabase.from("scores").insert({
    score_game_key: input.gameKey,
    score_player_id: input.playerId,
    score_correct_count: input.score,
    score_total_questions: input.totalQuestions,
    score_duration_seconds: input.durationSeconds,
  });

  if (error) {
    return { message: formatScoreErrorMessage(error.message) };
  }

  return {};
}
