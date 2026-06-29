import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAt: string;
}

export interface ScoreInput {
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

interface ScoreRow {
  score_id: string;
  score_player_id: string;
  score_correct_count: number;
  score_total_questions: number;
  score_duration_seconds: number;
  score_created_at: string;
}

function mapScoreRow(row: ScoreRow): LeaderboardEntry {
  return {
    id: row.score_id,
    playerId: row.score_player_id,
    score: row.score_correct_count,
    totalQuestions: row.score_total_questions,
    durationSeconds: row.score_duration_seconds,
    createdAt: row.score_created_at,
  };
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { entries: [], message: SUPABASE_MISSING_MESSAGE };
  }

  const { data, error } = await supabase
    .from("scores")
    .select(
      "score_id, score_player_id, score_correct_count, score_total_questions, score_duration_seconds, score_created_at",
    )
    .order("score_correct_count", { ascending: false })
    .order("score_duration_seconds", { ascending: true })
    .order("score_created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { entries: [], message: error.message };
  }

  return { entries: ((data ?? []) as ScoreRow[]).map(mapScoreRow) };
}

export async function submitScore(input: ScoreInput): Promise<{ message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { message: SUPABASE_MISSING_MESSAGE };
  }

  const { error } = await supabase.from("scores").insert({
    score_player_id: input.playerId,
    score_correct_count: input.score,
    score_total_questions: input.totalQuestions,
    score_duration_seconds: input.durationSeconds,
  });

  if (error) {
    return { message: error.message };
  }

  return {};
}
