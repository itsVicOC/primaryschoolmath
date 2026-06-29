create extension if not exists pgcrypto;

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id text not null check (char_length(trim(player_id)) between 1 and 24),
  score integer not null check (score between 0 and 100),
  total_questions integer not null default 100 check (total_questions = 100),
  duration_seconds integer not null check (duration_seconds between 0 and 600),
  created_at timestamptz not null default now()
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
    char_length(trim(player_id)) between 1 and 24
    and score between 0 and 100
    and total_questions = 100
    and duration_seconds between 0 and 600
  );

create index if not exists scores_leaderboard_idx
  on public.scores (score desc, duration_seconds asc, created_at asc);
