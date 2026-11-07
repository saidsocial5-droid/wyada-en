-- M1: the core loop on the server. Start a course, complete a lesson.
-- All gamification writes happen here, inside one transaction, never from the client.
-- XP and streak rules mirror app/src/lesson/rules.ts (tested on both sides).

alter table lesson_sessions add column if not exists result jsonb;

-- Ordered list of a course's nodes (section → unit → node).
create or replace function course_nodes(p_course_id uuid)
returns table (node_id uuid, ordinal int, unit_id uuid, kind text, levels int)
language sql stable security definer set search_path = public as $$
  select n.id,
         (row_number() over (order by s.position, u.position, n.position))::int,
         u.id, n.kind, n.levels
  from path_nodes n
  join units u on u.id = n.unit_id
  join sections s on s.id = u.section_id
  where s.course_id = p_course_id
$$;

-- XP rule: 10 per finished lesson, +5 if no mistakes.
create or replace function lesson_xp(p_wrong int) returns int
language sql immutable as $$ select 10 + case when p_wrong = 0 then 5 else 0 end $$;

-- S02: pick a course (and save onboarding answers). Safe to call again.
create or replace function start_course(
  p_course_slug text, p_timezone text default null, p_daily_goal_xp int default null, p_ui_language text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_course uuid;
  v_first uuid;
  v_uc uuid;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '28000'; end if;

  select id into v_course from courses where slug = p_course_slug and published;
  if v_course is null then raise exception 'unknown course %', p_course_slug using errcode = 'P0002'; end if;

  if p_timezone is not null and not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone %', p_timezone using errcode = '22023';
  end if;

  update profiles set
    timezone = coalesce(p_timezone, timezone),
    daily_goal_xp = coalesce(p_daily_goal_xp, daily_goal_xp),
    ui_language = coalesce(p_ui_language, ui_language)
  where id = v_uid;

  select node_id into v_first from course_nodes(v_course) order by ordinal limit 1;

  update user_courses set is_active = false where user_id = v_uid and course_id <> v_course and is_active;
  insert into user_courses (user_id, course_id, current_node_id, is_active)
  values (v_uid, v_course, v_first, true)
  on conflict (user_id, course_id) do update set is_active = true
  returning id into v_uc;
  return v_uc;
end $$;

-- S11 → S13: finish a lesson.
-- p_attempts: [{exercise_id, answer, is_correct, had_typo, time_ms}], every try in order (wrong ones included).
-- Idempotent on p_client_session_id: a replay (offline retry, double tap) returns the first result.
create or replace function complete_lesson(
  p_client_session_id uuid, p_node_id uuid, p_started_at timestamptz, p_attempts jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_course uuid;
  v_uc user_courses%rowtype;
  v_ord int; v_cur_ord int; v_levels int; v_level int; v_prev_levels int; v_was_done boolean;
  v_needed int; v_solved int; v_total int; v_wrong int; v_bad int;
  v_xp int; v_tz text; v_today date;
  v_st streaks%rowtype; v_new_len int; v_extended boolean := false;
  v_levels_done int; v_node_done boolean; v_next uuid; v_session uuid;
  v_today_xp int; v_result jsonb; v_existing jsonb;
  c_min_seconds_per_exercise constant int := 2;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '28000'; end if;

  select s.course_id into v_course
  from path_nodes n join units u on u.id = n.unit_id join sections s on s.id = u.section_id
  where n.id = p_node_id;
  if v_course is null then raise exception 'unknown node' using errcode = 'P0002'; end if;

  -- one lesson completion per user at a time
  select * into v_uc from user_courses where user_id = v_uid and course_id = v_course and is_active for update;
  if not found then raise exception 'course not started' using errcode = 'P0001'; end if;

  select result into v_existing from lesson_sessions
  where user_id = v_uid and client_session_id = p_client_session_id and status = 'completed';
  if v_existing is not null then return v_existing || jsonb_build_object('replayed', true); end if;

  -- unlocked = at or before the current node, or already started
  select ordinal, levels into v_ord, v_levels from course_nodes(v_course) where node_id = p_node_id;
  select ordinal into v_cur_ord from course_nodes(v_course) where node_id = v_uc.current_node_id;
  select levels_done, completed_at is not null into v_prev_levels, v_was_done
  from node_progress where user_id = v_uid and node_id = p_node_id;
  v_prev_levels := coalesce(v_prev_levels, 0);
  v_was_done := coalesce(v_was_done, false);
  if v_ord > coalesce(v_cur_ord, v_ord) and v_prev_levels = 0 then
    raise exception 'node locked' using errcode = '42501';
  end if;
  v_level := least(v_prev_levels + 1, v_levels);

  -- validate attempts
  if jsonb_typeof(p_attempts) is distinct from 'array' or jsonb_array_length(p_attempts) = 0
     or jsonb_array_length(p_attempts) > 200 then
    raise exception 'attempts must be a non-empty array' using errcode = '22023';
  end if;
  select count(*) into v_needed from exercises where node_id = p_node_id and level = v_level;
  with a as (
    select (x->>'exercise_id')::uuid as exercise_id, coalesce((x->>'is_correct')::boolean, false) as ok
    from jsonb_array_elements(p_attempts) x)
  select count(distinct a.exercise_id) filter (where a.ok and e.id is not null),
         count(*),
         count(*) filter (where not a.ok),
         count(*) filter (where e.id is null)
    into v_solved, v_total, v_wrong, v_bad
  from a left join exercises e on e.id = a.exercise_id and e.node_id = p_node_id and e.level = v_level;
  if v_bad > 0 then raise exception 'attempt for an exercise outside this lesson' using errcode = '22023'; end if;
  if v_solved < v_needed then raise exception 'lesson not finished (% of %)', v_solved, v_needed using errcode = '22023'; end if;
  if p_started_at > now() + interval '1 minute'
     or now() - p_started_at < make_interval(secs => v_needed * c_min_seconds_per_exercise) then
    raise exception 'lesson finished too fast' using errcode = '22023';
  end if;

  v_xp := lesson_xp(v_wrong);
  select timezone into v_tz from profiles where id = v_uid;
  v_today := (now() at time zone v_tz)::date;

  insert into lesson_sessions (user_id, node_id, mode, client_session_id, started_at, ended_at, status,
                               xp_earned, correct_count, total_count, local_date)
  values (v_uid, p_node_id, case when v_was_done then 'practice' else 'normal' end, p_client_session_id,
          p_started_at, now(), 'completed', v_xp, v_total - v_wrong, v_total, v_today)
  returning id into v_session;

  insert into attempts (session_id, user_id, exercise_id, answer, is_correct, had_typo, time_ms)
  select v_session, v_uid, (x->>'exercise_id')::uuid, left(x->>'answer', 500),
         coalesce((x->>'is_correct')::boolean, false), coalesce((x->>'had_typo')::boolean, false),
         nullif(x->>'time_ms', '')::int
  from jsonb_array_elements(p_attempts) x;

  insert into mistakes (user_id, exercise_id, times_wrong, last_wrong_at)
  select v_uid, (x->>'exercise_id')::uuid, count(*), now()
  from jsonb_array_elements(p_attempts) x
  where not coalesce((x->>'is_correct')::boolean, false)
  group by (x->>'exercise_id')
  on conflict (user_id, exercise_id) do update
    set times_wrong = mistakes.times_wrong + excluded.times_wrong, last_wrong_at = now(), resolved_at = null;

  insert into node_progress (user_id, node_id, levels_done, completed_at)
  values (v_uid, p_node_id, 1, case when v_levels <= 1 then now() end)
  on conflict (user_id, node_id) do update set
    levels_done = least(node_progress.levels_done + 1, v_levels),
    completed_at = coalesce(node_progress.completed_at,
                            case when node_progress.levels_done + 1 >= v_levels then now() end)
  returning levels_done, completed_at is not null into v_levels_done, v_node_done;

  -- advance the path when the current node is finished
  if v_node_done and not v_was_done and v_ord >= coalesce(v_cur_ord, v_ord) then
    select node_id into v_next from course_nodes(v_course) where ordinal = v_ord + 1;
  end if;
  update user_courses
     set total_xp = total_xp + v_xp, current_node_id = coalesce(v_next, current_node_id)
   where id = v_uc.id;

  -- streak, by the user's local day (a later date can only come from a timezone change: same day)
  select * into v_st from streaks where user_id = v_uid for update;
  if v_st.last_active_date >= v_today then
    v_new_len := v_st.current_length;
  elsif v_st.last_active_date = v_today - 1 then
    v_new_len := v_st.current_length + 1; v_extended := true;
  else
    v_new_len := 1; v_extended := true;   -- freezes arrive in M2
  end if;
  update streaks set current_length = v_new_len, longest = greatest(longest, v_new_len), last_active_date = greatest(v_today, coalesce(last_active_date, v_today))
   where user_id = v_uid;
  insert into streak_days (user_id, local_date, status, xp) values (v_uid, v_today, 'done', v_xp)
  on conflict (user_id, local_date) do update set status = 'done', xp = streak_days.xp + excluded.xp
  returning xp into v_today_xp;

  v_result := jsonb_build_object(
    'session_id', v_session,
    'xp', v_xp,
    'total_xp', v_uc.total_xp + v_xp,
    'today_xp', v_today_xp,
    'correct', v_total - v_wrong,
    'total', v_total,
    'accuracy', round(100.0 * (v_total - v_wrong) / v_total),
    'perfect', v_wrong = 0,
    'streak', v_new_len,
    'streak_extended', v_extended,
    'levels_done', v_levels_done,
    'node_completed', v_node_done,
    'next_node_id', v_next,
    'local_date', v_today,
    'replayed', false);
  update lesson_sessions set result = v_result where id = v_session;
  return v_result;
end $$;

-- Only signed-in users (anonymous guests included) may call the loop; internals stay private.
revoke execute on function start_course(text, text, int, text) from public, anon;
revoke execute on function complete_lesson(uuid, uuid, timestamptz, jsonb) from public, anon;
revoke execute on function course_nodes(uuid) from public, anon;
grant execute on function start_course(text, text, int, text) to authenticated;
grant execute on function complete_lesson(uuid, uuid, timestamptz, jsonb) to authenticated;
grant execute on function course_nodes(uuid) to authenticated;
revoke execute on function user_plan(uuid) from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
