alter table if exists public.scores
  add column if not exists score_game_key text not null default 'arithmetic';

update public.scores
set score_game_key = 'arithmetic'
where score_game_key is null or trim(score_game_key) = '';

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.scores'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%score_total_questions%'
        or pg_get_constraintdef(oid) like '%score_game_key%'
      )
  loop
    execute format('alter table public.scores drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

alter table public.scores
  add constraint scores_score_game_key_check
  check (score_game_key in ('arithmetic', 'make-ten', 'place-value', 'compare'));

alter table public.scores
  add constraint scores_score_total_questions_range
  check (score_total_questions between 1 and 100);

alter table public.scores
  drop constraint if exists scores_score_correct_count_total_check;

alter table public.scores
  add constraint scores_score_correct_count_total_check
  check (score_correct_count <= score_total_questions);

drop policy if exists "anyone can insert scores" on public.scores;
create policy "anyone can insert scores"
  on public.scores
  for insert
  to anon, authenticated
  with check (
    score_game_key in ('arithmetic', 'make-ten', 'place-value', 'compare')
    and char_length(trim(score_player_id)) between 1 and 24
    and score_correct_count between 0 and 100
    and score_total_questions between 1 and 100
    and score_correct_count <= score_total_questions
    and score_duration_seconds between 0 and 600
  );

drop index if exists public.scores_leaderboard_idx;
create index if not exists scores_leaderboard_idx
  on public.scores (
    score_game_key,
    score_correct_count desc,
    score_duration_seconds asc,
    score_created_at asc
  );
