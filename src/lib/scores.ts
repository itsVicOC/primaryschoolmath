import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  score: number;
  total_questions: number;
  duration_seconds: number;
  created_at: string;
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

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { entries: [], message: SUPABASE_MISSING_MESSAGE };
  }

  const { data, error } = await supabase
    .from("scores")
    .select("id, player_id, score, total_questions, duration_seconds, created_at")
    .order("score", { ascending: false })
    .order("duration_seconds", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { entries: [], message: error.message };
  }

  return { entries: data ?? [] };
}

export async function submitScore(input: ScoreInput): Promise<{ message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { message: SUPABASE_MISSING_MESSAGE };
  }

  const { error } = await supabase.from("scores").insert({
    player_id: input.playerId,
    score: input.score,
    total_questions: input.totalQuestions,
    duration_seconds: input.durationSeconds,
  });

  if (error) {
    return { message: error.message };
  }

  return {};
}
