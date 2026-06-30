do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.scores'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%score_game_key%'
  loop
    execute format('alter table public.scores drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

alter table public.scores
  add constraint scores_score_game_key_check
  check (
    score_game_key in (
      'arithmetic',
      'make-ten',
      'place-value',
      'compare',
      'column-arithmetic',
      'multiplication-groups',
      'times-table'
    )
  );

drop policy if exists "anyone can insert scores" on public.scores;
create policy "anyone can insert scores"
  on public.scores
  for insert
  to anon, authenticated
  with check (
    score_game_key in (
      'arithmetic',
      'make-ten',
      'place-value',
      'compare',
      'column-arithmetic',
      'multiplication-groups',
      'times-table'
    )
    and char_length(trim(score_player_id)) between 1 and 24
    and score_correct_count between 0 and 100
    and score_total_questions between 1 and 100
    and score_correct_count <= score_total_questions
    and score_duration_seconds between 0 and 600
  );
