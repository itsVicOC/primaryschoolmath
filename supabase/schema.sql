create extension if not exists pgcrypto;

create table if not exists public.scores (
  score_id uuid primary key default gen_random_uuid(),
  score_player_id text not null check (char_length(trim(score_player_id)) between 1 and 24),
  score_correct_count integer not null check (score_correct_count between 0 and 100),
  score_total_questions integer not null default 100 check (score_total_questions = 100),
  score_duration_seconds integer not null check (score_duration_seconds between 0 and 600),
  score_created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

drop policy if exists "scores are readable" on public.scores;
create policy "scores are readable"
  on public.scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "anyone can insert scores" on public.scores;
create policy "anyone can insert scores"
  on public.scores
  for insert
  to anon, authenticated
  with check (
    char_length(trim(score_player_id)) between 1 and 24
    and score_correct_count between 0 and 100
    and score_total_questions = 100
    and score_duration_seconds between 0 and 600
  );

create index if not exists scores_leaderboard_idx
  on public.scores (score_correct_count desc, score_duration_seconds asc, score_created_at asc);
