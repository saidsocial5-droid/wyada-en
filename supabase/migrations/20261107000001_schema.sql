-- WYADA EN: first migration (Supabase / Postgres 15+)
-- Access model: Row Level Security on every table.
--   * Content tables (courses..exercises, words, shop_items, quests, achievements, leagues): readable by any signed-in user, written only by service role (seed scripts).
--   * User tables: a user can SELECT their own rows. Gamification writes (XP, streak, energy, gems, league XP, quests)
--     go ONLY through SECURITY DEFINER functions / edge functions, never direct INSERT/UPDATE from the client.
-- All times are timestamptz in UTC. A user's "day" is computed from profiles.timezone.

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- updated_at helper
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

------------------------------------------------------------------ users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  avatar jsonb not null default '{}',
  ui_language text not null default 'ar' check (ui_language in ('ar','fr','en')),
  timezone text not null default 'Africa/Casablanca',      -- IANA name, from device
  daily_goal_xp int not null default 20 check (daily_goal_xp in (10,20,30,50)),
  reminder_time time,                                      -- local time
  learning_reason text,
  is_private boolean not null default false,
  sound_on boolean not null default true,
  speaking_on boolean not null default true,
  listening_on boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android','ios','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on push_tokens (user_id);

------------------------------------------------------------------ content
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- 'en-from-ar', 'en-from-fr'
  from_language text not null check (from_language in ('ar','fr')),
  to_language text not null default 'en' check (to_language = 'en'),
  title text not null,
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null,
  title text not null,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table units (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  position int not null,
  title text not null,
  colour text not null default 'primary',    -- design token name, not a hex
  guidebook jsonb not null default '[]',     -- [{phrase, translation, audio_path, tip}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, position)
);

create table path_nodes (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('lesson','story','review','chest','unit_test','roleplay')),
  levels int not null default 1 check (levels between 1 and 5),
  is_premium boolean not null default false, -- roleplay nodes: Max
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, position)
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references path_nodes(id) on delete cascade,
  level int not null default 1,
  position int not null,
  kind text not null check (kind in (
    'translate_to_en','translate_from_en','word_bank','tap_what_you_hear','listen_type',
    'match_pairs','select_image','multiple_choice','fill_blank','speak','dialogue','story_line')),
  prompt jsonb not null,          -- shape depends on kind; validated by zod in app
  solutions text[] not null default '{}',   -- accepted answers, normalised
  tokens text[] not null default '{}',      -- word bank incl. distractors
  audio_path text,                -- storage path, pre-generated TTS
  slow_audio_path text,
  image_path text,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on exercises (node_id, level, position);

create table words (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  text text not null,
  translation text not null,
  audio_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, text)
);

create table exercise_words (
  exercise_id uuid not null references exercises(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  primary key (exercise_id, word_id)
);
create index on exercise_words (word_id);

------------------------------------------------------------------ progress
create table user_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete restrict,
  is_active boolean not null default true,
  current_node_id uuid references path_nodes(id) on delete set null,
  placement_unit_id uuid references units(id) on delete set null,
  total_xp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index on user_courses (course_id);
create unique index one_active_course on user_courses (user_id) where is_active;

create table node_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  node_id uuid not null references path_nodes(id) on delete cascade,
  levels_done int not null default 0,
  legendary boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, node_id)
);
create index on node_progress (node_id);

create table lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  node_id uuid references path_nodes(id) on delete set null,
  mode text not null check (mode in ('normal','practice','legendary','placement','mistakes','words','story')),
  client_session_id uuid not null,          -- idempotency key from the device (offline replay)
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'started' check (status in ('started','completed','abandoned','failed')),
  xp_earned int not null default 0,
  correct_count int not null default 0,
  total_count int not null default 0,
  combo_max int not null default 0,
  energy_spent int not null default 0,
  local_date date,                           -- user's local date at completion
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_session_id)
);
create index on lesson_sessions (user_id, ended_at desc);
create index on lesson_sessions (node_id);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lesson_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  answer text,
  is_correct boolean not null,
  had_typo boolean not null default false,
  time_ms int,
  created_at timestamptz not null default now()
);
create index on attempts (session_id);
create index on attempts (user_id, created_at desc);
create index on attempts (exercise_id);

create table mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  times_wrong int not null default 1,
  last_wrong_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);
create index on mistakes (user_id, resolved_at, last_wrong_at desc);

create table user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  strength smallint not null default 0 check (strength between 0 and 5),   -- SRS box
  next_review_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word_id)
);
create index on user_words (user_id, next_review_at);
create index on user_words (word_id);

------------------------------------------------------------------ retention & economy
create table streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_length int not null default 0,
  longest int not null default 0,
  last_active_date date,                    -- local date
  freezes_equipped int not null default 0 check (freezes_equipped between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table streak_days (
  user_id uuid not null references profiles(id) on delete cascade,
  local_date date not null,
  status text not null check (status in ('done','frozen','missed')),
  xp int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

create table economy (
  user_id uuid primary key references profiles(id) on delete cascade,
  gems int not null default 500 check (gems >= 0),
  energy int not null default 25 check (energy >= 0),
  energy_updated_at timestamptz not null default now(),  -- regen computed lazily from this
  xp_boost_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shop_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,                 -- 'energy_refill','streak_freeze','xp_boost_15m'
  price_gems int not null check (price_gems >= 0),
  effect jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- append-only ledger; economy.gems is the cached balance
create table gem_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('lesson','quest','chest','league','purchase','shop','refund','admin')),
  ref_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index on gem_ledger (user_id, created_at desc);

------------------------------------------------------------------ social & competition
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index on follows (followee_id);

create table leagues (
  tier smallint primary key check (tier between 1 and 10),
  name_key text not null                     -- i18n key; WYADA EN's own league names
);

create table league_cohorts (
  id uuid primary key default gen_random_uuid(),
  tier smallint not null references leagues(tier) on delete restrict,
  week_start date not null,                  -- Monday, UTC
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on league_cohorts (week_start, tier);

create table cohort_members (
  cohort_id uuid not null references league_cohorts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  week_xp int not null default 0,
  final_rank int,
  result text check (result in ('promoted','stayed','demoted')),
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);
create index on cohort_members (user_id);
create index on cohort_members (cohort_id, week_xp desc);

create table quests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily','friend','monthly')),
  metric text not null check (metric in ('xp','lessons','perfect_lessons','minutes','combo','speak_exercises')),
  target int not null check (target > 0),
  reward_gems int not null default 0,
  title_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  period_start date not null,                -- local date (daily), Monday (friend), 1st (monthly)
  progress int not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quest_id, period_start)
);
create index on user_quests (quest_id);

create table friend_quest_pairs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete restrict,
  progress int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (week_start, user_a),
  unique (week_start, user_b)
);
create index on friend_quest_pairs (quest_id);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  tiers int[] not null,                      -- thresholds
  title_key text not null,
  created_at timestamptz not null default now()
);

create table user_achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  tier int not null default 1,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index on user_achievements (achievement_id);

------------------------------------------------------------------ premium & AI
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null check (plan in ('plus','max')),
  period text not null check (period in ('month','year')),
  is_family boolean not null default false,
  store text not null default 'google_play' check (store in ('google_play','app_store')),
  product_id text not null,
  purchase_token text not null unique,       -- Google Play token, verified server-side
  status text not null check (status in ('trial','active','grace','on_hold','paused','cancelled','expired')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on subscriptions (user_id, status);

create table family_members (
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (subscription_id, user_id)
);
create unique index one_family_per_user on family_members (user_id);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('explain','roleplay','voice_call')),
  scenario_slug text,
  exercise_id uuid references exercises(id) on delete set null,
  transcript jsonb not null default '[]',
  feedback jsonb,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  audio_seconds int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_conversations (user_id, created_at desc);
create index on ai_conversations (exercise_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  exercise_id uuid not null references exercises(id) on delete cascade,
  answer text,
  reason text not null check (reason in ('my_answer_should_be_accepted','audio_problem','wrong_prompt','other')),
  created_at timestamptz not null default now()
);
create index on reports (exercise_id);

------------------------------------------------------------------ derived plan (single source of truth for gating)
create or replace function user_plan(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select s.plan from subscriptions s
    left join family_members f on f.subscription_id = s.id
    where (s.user_id = uid or f.user_id = uid)
      and s.status in ('trial','active','grace')
      and s.current_period_end > now()
    order by (s.plan = 'max') desc limit 1), 'free')
$$;

------------------------------------------------------------------ RLS
do $$
declare t text;
begin
  foreach t in array array['profiles','push_tokens','courses','sections','units','path_nodes','exercises','words',
    'exercise_words','user_courses','node_progress','lesson_sessions','attempts','mistakes','user_words','streaks',
    'streak_days','economy','shop_items','gem_ledger','follows','leagues','league_cohorts','cohort_members','quests',
    'user_quests','friend_quest_pairs','achievements','user_achievements','subscriptions','family_members',
    'ai_conversations','reports']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- content: read for signed-in users
create policy read_content on courses for select to authenticated using (published);
create policy read_content on sections for select to authenticated using (true);
create policy read_content on units for select to authenticated using (true);
create policy read_content on path_nodes for select to authenticated using (true);
create policy read_content on exercises for select to authenticated using (true);
create policy read_content on words for select to authenticated using (true);
create policy read_content on exercise_words for select to authenticated using (true);
create policy read_content on shop_items for select to authenticated using (active);
create policy read_content on leagues for select to authenticated using (true);
create policy read_content on quests for select to authenticated using (active);
create policy read_content on achievements for select to authenticated using (true);

-- own rows: read
create policy own_read on user_courses for select to authenticated using (user_id = auth.uid());
create policy own_read on node_progress for select to authenticated using (user_id = auth.uid());
create policy own_read on lesson_sessions for select to authenticated using (user_id = auth.uid());
create policy own_read on attempts for select to authenticated using (user_id = auth.uid());
create policy own_read on mistakes for select to authenticated using (user_id = auth.uid());
create policy own_read on user_words for select to authenticated using (user_id = auth.uid());
create policy own_read on streak_days for select to authenticated using (user_id = auth.uid());
create policy own_read on economy for select to authenticated using (user_id = auth.uid());
create policy own_read on gem_ledger for select to authenticated using (user_id = auth.uid());
create policy own_read on user_quests for select to authenticated using (user_id = auth.uid());
create policy own_read on subscriptions for select to authenticated using (user_id = auth.uid());
create policy own_read on family_members for select to authenticated using (user_id = auth.uid());
create policy own_read on ai_conversations for select to authenticated using (user_id = auth.uid());
create policy own_rw on push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_insert on reports for insert to authenticated with check (user_id = auth.uid());

-- profiles: everyone can see public profiles; you edit your own (gamification columns live elsewhere)
create policy profile_read on profiles for select to authenticated using (not is_private or id = auth.uid());
create policy profile_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- social visibility: streak, achievements, league rows of public profiles
create policy public_read on streaks for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = user_id and not p.is_private));
create policy public_read on user_achievements for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = user_id and not p.is_private));
-- security definer helper avoids RLS recursion on cohort_members
create or replace function my_cohort_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select cohort_id from cohort_members where user_id = auth.uid()
$$;
create policy cohort_read on league_cohorts for select to authenticated
  using (league_cohorts.id in (select my_cohort_ids()));
create policy cohort_read on cohort_members for select to authenticated
  using (cohort_members.cohort_id in (select my_cohort_ids()));
create policy follows_read on follows for select to authenticated using (true);
create policy follows_write on follows for insert to authenticated with check (follower_id = auth.uid());
create policy follows_delete on follows for delete to authenticated using (follower_id = auth.uid());
create policy pair_read on friend_quest_pairs for select to authenticated using (auth.uid() in (user_a, user_b));

------------------------------------------------------------------ new user bootstrap
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name',''));
  insert into streaks (user_id) values (new.id);
  insert into economy (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- seed: league tiers (names are i18n keys, WYADA EN's own)
insert into leagues (tier, name_key) values
 (1,'league.sand'),(2,'league.palm'),(3,'league.cedar'),(4,'league.copper'),(5,'league.silver'),
 (6,'league.gold'),(7,'league.jade'),(8,'league.sapphire'),(9,'league.ruby'),(10,'league.atlas');
