\set ON_ERROR_STOP 1
-- helpers (test only)
create or replace function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm not like p_like then raise exception 'expected error like "%", got "%"', p_like, sqlerrm; end if;
    return;
  end;
  raise exception 'expected error like "%", got success', p_like;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', true), ('00000000-0000-0000-0000-0000000000b2', true);

-- attempts for a node: every exercise correct; optionally the first one wrong once first
create or replace function pg_temp.attempts(p_node uuid, p_wrong_first boolean) returns jsonb language sql as $$
  select coalesce(case when p_wrong_first then (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'answer', 'nope', 'is_correct', false))
                    from exercises where node_id = p_node order by position limit 1) else '[]'::jsonb end, '[]'::jsonb)
      || (select jsonb_agg(jsonb_build_object('exercise_id', id, 'answer', solutions[1], 'is_correct', true, 'time_ms', 3000) order by position)
          from exercises where node_id = p_node)
$$;
grant execute on function pg_temp.attempts(uuid, boolean) to authenticated;

-- 1. anon may not call the loop
set role anon;
select pg_temp.expect_error($$select start_course('en-from-ar')$$, 'permission denied%');
reset role;

-- 2. sign-up trigger
do $$ begin
  assert (select count(*) from profiles) = 2, 'profiles created';
  assert (select gems from economy where user_id = '00000000-0000-0000-0000-0000000000a1') = 500, 'starting gems';
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

-- 3. start course
select pg_temp.expect_error($$select start_course('en-from-ar', 'Mars/Olympus')$$, 'unknown timezone%');
select pg_temp.expect_error($$select start_course('nope')$$, 'unknown course%');
select start_course('en-from-ar', 'Africa/Casablanca', 20, 'ar');
select start_course('en-from-ar');  -- idempotent

do $$
declare c uuid := (select id from courses where slug = 'en-from-ar');
  n1 uuid := (select node_id from course_nodes(c) where ordinal = 1);
  n2 uuid := (select node_id from course_nodes(c) where ordinal = 2);
  r jsonb; r2 jsonb; part jsonb;
begin
  assert (select current_node_id from user_courses) = n1, 'starts at node 1';

  -- 4. locked node
  perform pg_temp.expect_error(format($f$select complete_lesson(gen_random_uuid(), %L, now() - interval '5 min', pg_temp.attempts(%L, false))$f$, n2, n2), 'node locked%');
  -- 5. unfinished lesson
  part := (select jsonb_agg(x) from jsonb_array_elements(pg_temp.attempts(n1, false)) with ordinality as t(x, i) where i < 6);
  perform pg_temp.expect_error(format($f$select complete_lesson(gen_random_uuid(), %L, now() - interval '5 min', %L)$f$, n1, part), 'lesson not finished (5 of 6)%');
  -- 6. too fast
  perform pg_temp.expect_error(format($f$select complete_lesson(gen_random_uuid(), %L, now(), pg_temp.attempts(%L, false))$f$, n1, n1), 'lesson finished too fast%');
  -- foreign exercise
  perform pg_temp.expect_error(format($f$select complete_lesson(gen_random_uuid(), %L, now() - interval '5 min', pg_temp.attempts(%L, false) || pg_temp.attempts(%L, false))$f$, n1, n1, n2), 'attempt for an exercise outside%');

  -- 7. a real completion with one mistake
  r := complete_lesson('11111111-1111-1111-1111-111111111111', n1, now() - interval '3 min', pg_temp.attempts(n1, true));
  assert (r->>'xp')::int = 10, 'xp with a mistake: ' || r;
  assert (r->>'accuracy')::int = 86, 'accuracy 6/7: ' || r;
  assert (r->>'streak')::int = 1 and (r->>'streak_extended')::boolean, 'streak starts';
  assert (r->>'node_completed')::boolean and (r->>'next_node_id')::uuid = n2, 'path advances';
  assert (select current_node_id from user_courses) = n2, 'current node moved';
  assert (select times_wrong from mistakes) = 1, 'mistake recorded';
  assert (select count(*) from attempts) = 7, 'attempts stored';

  -- 8. replay is idempotent
  r2 := complete_lesson('11111111-1111-1111-1111-111111111111', n1, now() - interval '3 min', pg_temp.attempts(n1, true));
  assert (r2->>'replayed')::boolean and (r2->>'xp')::int = 10, 'replay returns first result';
  assert (select total_xp from user_courses) = 10, 'replay adds no XP';
  assert (select count(*) from lesson_sessions) = 1, 'one session';

  -- 9. perfect lesson, same day
  r := complete_lesson(gen_random_uuid(), n2, now() - interval '3 min', pg_temp.attempts(n2, false));
  assert (r->>'xp')::int = 15 and (r->>'perfect')::boolean, 'perfect bonus';
  assert (r->>'today_xp')::int = 25 and (r->>'total_xp')::int = 25, 'today and total xp: ' || r;
  assert (r->>'streak')::int = 1 and not (r->>'streak_extended')::boolean, 'same day keeps streak';

  -- 13. practising a finished node: allowed, path does not move
  r := complete_lesson(gen_random_uuid(), n1, now() - interval '3 min', pg_temp.attempts(n1, false));
  assert r->>'next_node_id' is null, 'practice does not advance';
  assert (select mode from lesson_sessions where id = (r->>'session_id')::uuid) = 'practice', 'practice mode';
  assert (select ordinal from course_nodes(c) where node_id = (select current_node_id from user_courses)) = 3, 'still at node 3';
end $$;

-- 12. RLS: no direct writes to gamification, no reading other users
do $$ declare n int; begin
  update economy set gems = 99999; get diagnostics n = row_count; assert n = 0, 'cannot update economy';
  update streaks set current_length = 500; get diagnostics n = row_count; assert n = 0, 'cannot update streak';
end $$;
select pg_temp.expect_error($$insert into node_progress (user_id, node_id) select auth.uid(), id from path_nodes limit 1$$, '%row-level security%');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from lesson_sessions) = 0, 'user B sees none of A''s sessions';
  assert (select count(*) from attempts) = 0, 'user B sees none of A''s attempts';
  assert (select count(*) from streaks) = 2, 'public streaks are visible (profiles are public)';
end $$;
select pg_temp.expect_error($$select complete_lesson(gen_random_uuid(), (select id from path_nodes limit 1), now() - interval '5 min', '[]')$$, 'course not started%');
reset role;

-- 10/11. streak across days (time travel by moving the stored dates back)
update streaks set last_active_date = last_active_date - 1 where user_id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ declare c uuid := (select id from courses where slug = 'en-from-ar'); n3 uuid := (select node_id from course_nodes(c) where ordinal = 3); r jsonb;
begin
  r := complete_lesson(gen_random_uuid(), n3, now() - interval '3 min', pg_temp.attempts(n3, false));
  assert (r->>'streak')::int = 2 and (r->>'streak_extended')::boolean, 'yesterday → streak 2: ' || r;
end $$;
reset role;
update streaks set last_active_date = last_active_date - 3 where user_id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
do $$ declare c uuid := (select id from courses where slug = 'en-from-ar'); n4 uuid := (select node_id from course_nodes(c) where ordinal = 4); r jsonb;
begin
  r := complete_lesson(gen_random_uuid(), n4, now() - interval '3 min', pg_temp.attempts(n4, false));
  assert (r->>'streak')::int = 1, 'gap → streak resets: ' || r;
  assert (select longest from streaks where user_id = auth.uid()) = 2, 'longest kept';
end $$;
reset role;
select 'ALL M1 SQL TESTS PASSED' as result;
