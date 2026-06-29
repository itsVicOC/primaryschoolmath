do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'id'
  ) then
    alter table public.scores rename column id to score_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'player_id'
  ) then
    alter table public.scores rename column player_id to score_player_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'score'
  ) then
    alter table public.scores rename column score to score_correct_count;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'total_questions'
  ) then
    alter table public.scores rename column total_questions to score_total_questions;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'duration_seconds'
  ) then
    alter table public.scores rename column duration_seconds to score_duration_seconds;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scores' and column_name = 'created_at'
  ) then
    alter table public.scores rename column created_at to score_created_at;
  end if;
end $$;

drop index if exists public.scores_leaderboard_idx;

create index if not exists scores_leaderboard_idx
  on public.scores (score_correct_count desc, score_duration_seconds asc, score_created_at asc);
