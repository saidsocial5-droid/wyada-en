# WYADA EN: architecture

Inputs: `replica/recon.md`, `replica/features.csv`. Schema: `replica/schema.sql` (first migration; tested on Postgres 16).

Product: a gamified English course for **Arabic and French speakers**. Android first. The UI is in Arabic (RTL), French and English.

## 1. Stack

| layer | choice | why |
| --- | --- | --- |
| mobile app | **Expo SDK 58 (React Native 0.88) + TypeScript**, Expo Router, app in `app/` | one codebase for Android now and iOS/web later; OTA updates; RTL support through `I18nManager` |
| styling | typed theme generated from `replica/design/tokens.json` (`app/src/theme`); `tailwind.preset.cjs` is generated too, so NativeWind can be added once it's verified on Expo SDK 58 | no Babel/Metro plugin risk on a brand-new SDK |
| state / data | TanStack Query + Zustand; MMKV for offline cache | lessons must survive bad networks |
| i18n | i18next + `expo-localization`; ar / fr / en | RTL flips layout automatically when `ar` |
| backend | **Supabase**: Postgres, Auth, Storage, Edge Functions (Deno), pg_cron | one managed service, Row Level Security, cheap at zero users |
| database | Postgres (Supabase), SQL migrations in `supabase/migrations` | one database, no microservices |
| auth | Supabase Auth: Google sign-in, email OTP, anonymous guest upgraded later | matches "lesson first, sign up after" (F01) |
| payments | **Google Play Billing** via `react-native-iap`, verified server-side with the Google Play Developer API plus Real-time Developer Notifications (Pub/Sub push → edge function) | Google Play requires its own billing for digital subscriptions in Android apps, so Stripe can't be used here |
| AI text | Claude API (`claude-haiku-5-5` for Explain-my-answer, `claude-sonnet-5-5` for Roleplay), called only from edge functions | keys never ship in the app; prompt caching on the fixed system prompts |
| speech-to-text | on-device Android speech recognition for speak exercises (free); a hosted STT API for Max voice calls | free tier costs nothing per exercise |
| text-to-speech | course audio **pre-generated** with a TTS API at build time, stored in Supabase Storage; live TTS only for Max calls | lesson audio is free to serve and works offline |
| push | Expo Notifications (FCM) | reminders, streak saver |
| jobs | pg_cron + scheduled edge functions | league rollover, reminders, cleanup |
| analytics / errors | PostHog (EU), Sentry | funnel F01, crash reports |
| content pipeline | course written as JSON/YAML in `content/`, validated with zod, seeded by a script | content is reviewed in pull requests like code |
| CI / builds | GitHub Actions + EAS Build → Play Console internal track | |

## 2. Schema summary

33 tables in `replica/schema.sql`:

- **Users**: profiles, push_tokens
- **Content**: courses (`en-from-ar`, `en-from-fr`), sections, units, path_nodes, exercises, words, exercise_words
- **Progress**: user_courses, node_progress, lesson_sessions, attempts, mistakes, user_words (spaced repetition)
- **Retention and economy**: streaks, streak_days, economy (gems + energy), shop_items, gem_ledger
- **Social**: follows, leagues, league_cohorts, cohort_members, quests, user_quests, friend_quest_pairs, achievements, user_achievements
- **Premium and AI**: subscriptions, family_members, ai_conversations, reports

Decisions:

- **Access**: Row Level Security on every table. The app reads directly through the Supabase client. Every gamification write (XP, streak, energy, gems, league XP, quests) goes through one server path (`complete_lesson`), never through direct inserts. A user can only read their own rows; public profiles and league cohort mates are visible.
- **Plan gating** is one function, `user_plan(uid)` → `free | plus | max`. It covers family members. Every edge function calls it.
- **Idempotency**: `lesson_sessions (user_id, client_session_id)` is unique, so a lesson replayed after going offline counts once. `gem_ledger (user_id, idempotency_key)` is unique, so a webhook or quest claim never pays twice.
- **Energy** is stored as `energy + energy_updated_at` and regenerated lazily on read: `min(max, energy + floor(elapsed / regen_interval))`. No per-minute job.
- **Time**: everything is `timestamptz` in UTC. The streak "day" is `local_date`, computed on the server from `profiles.timezone` at completion time.
- **Courses** are one per source language. Translate exercises differ by direction, so `ar→en` and `fr→en` are separate content trees. The English audio files are shared.
- **No money columns**: prices live in Play Console. We store `product_id` and `purchase_token`.

## 3. API

Reads (path, node popover, profile, leaderboard, shop, quests) go through PostgREST with RLS. They are listed once here, not per flow:
`GET /rest/v1/{courses,sections,units,path_nodes,exercises,node_progress,streaks,economy,cohort_members,user_quests,...}` (signed-in user, filtered by RLS).

Writes are **edge functions** under `/functions/v1/`.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| POST `/onboarding` | save course, reason, goal, timezone; create user_course | signed-in (incl. anonymous) | course_slug, reason, daily_goal_xp, timezone | user_course | F01 |
| POST `/placement/complete` | score the placement session, set placement unit, mark earlier nodes done | owner | client_session_id, attempts[] | placement_unit_id | F03 |
| POST `/lesson/start` | check node unlocked; check energy (free plan); return exercises | owner | node_id, mode | session_id, exercises[], energy | F02 |
| POST `/lesson/complete` | **one transaction**: store attempts, compute XP server-side, update node_progress, mistakes, user_words, streak + streak_days, economy (energy, gems), cohort week_xp, quests, achievements | owner | client_session_id, node_id, mode, attempts[] (exercise_id, answer, ms) | xp, streak, quests progressed, rewards, new energy | F02 F09 F13 |
| POST `/energy/refill` | spend gems → full energy | owner | idempotency_key | economy | F05 |
| POST `/shop/buy` | buy item with gems (freeze ≤ 2 equipped, boosts) | owner | sku, idempotency_key | economy, streak | F07 |
| POST `/streak/repair` | restore a broken streak within 48 h (gems or Plus) | owner | — | streak | F07 |
| POST `/quests/claim` | claim a finished quest | owner | user_quest_id | gems | F08 |
| POST `/follow` / DELETE `/follow/:id` | follow / unfollow (RLS insert/delete) | owner | followee_id | — | F08 |
| GET `/friends/search` | search by username, rate-limited | signed-in | q | profiles[] | F08 |
| POST `/ai/explain` | explain why an answer is wrong, in the user's UI language | signed-in, all plans, daily cap | exercise_id, answer | explanation | F04 |
| POST `/ai/roleplay/turn` | next roleplay turn + end-of-scenario report | **max** | conversation_id?, scenario_slug, user_text or audio | reply, done, feedback | F11 |
| POST `/ai/call/session` | open a voice-call session (STT → Claude → TTS, streamed) with a time cap | **max** | scenario_slug | websocket URL, token | F10 |
| POST `/billing/verify` | verify a Play purchase token with the Google Play API, upsert subscription | signed-in | product_id, purchase_token | plan | F12 |
| POST `/billing/rtdn` | **webhook in**: Google Play Real-time Developer Notifications via Pub/Sub push; re-fetch and upsert state | Google (OIDC-verified) | Pub/Sub message | 200 | F12 |
| POST `/family/invite` / `/family/join` | invite code for a family plan (max 6) | plus/max owner / invitee | code | family | F12 |
| POST `/report` | report an exercise (RLS insert) | signed-in | exercise_id, reason, answer | — | F04 |
| DELETE `/account` | GDPR deletion: cancel nothing in Play (user does it), delete auth user → cascades | owner | confirmation | — | — |
| POST `/push/register` | save the FCM token (RLS upsert) | owner | token | — | F02 |

### Background jobs

| job | schedule | does |
| --- | --- | --- |
| `league_rollover` | Sunday 23:59 UTC | rank cohorts, promote top 7 / demote bottom 5 (config), pay gems to top 3, open new cohorts by tier for users active last week |
| `cohort_assign` | on first XP of the week (in `/lesson/complete`) | put the user in an open cohort of their tier (target 30 members) |
| `streak_sweep` | hourly | for users whose local day just ended: use a freeze or mark a missed day, reset the streak |
| `reminders` | every 15 min | push to users whose local `reminder_time` falls in this window and who haven't practised today; "streak saver" push at 21:00 local |
| `friend_quest_pairing` | Monday 00:05 UTC | pair mutual followers who were active last week |
| `subscription_reconcile` | daily | re-check subscriptions past `current_period_end` with the Play API (in case a webhook was missed) |
| `cleanup` | daily | delete abandoned sessions older than 7 days; trim attempts older than 1 year |

Only official public APIs with our own keys: Google Play Developer API, Claude API, an STT/TTS provider, FCM. No other app's endpoints.

## 4. The parts that bite

- **Time zones and DST**: the streak day comes from the server, using the IANA zone. The device clock is never trusted. If a user changes zone, the new zone applies from the next day, so a streak can't be gained or lost by travelling. Ramadan doesn't change dates, but reminder times may need a "quiet hours" option.
- **Cheating**: the client checks answers for instant feedback, so solutions do ship in the lesson payload. The server recomputes XP from the attempts, rejects sessions shorter than about 2 s per exercise, and caps XP per hour. Leagues use only server XP.
- **Idempotency**: offline lessons are replayed by `client_session_id`; Pub/Sub delivers at least once; gem changes are keyed in the ledger. Every write function is safe to call twice.
- **Race conditions**: `/lesson/complete` locks the user's `economy` and `streaks` rows (`select … for update`) inside one transaction. The same applies to shop purchases.
- **Answer matching**: normalise case, punctuation and Arabic/French diacritics on the source side; accept a list of solutions per exercise; allow an edit distance of 1 per word (flagged as a typo, still correct). This is the largest cause of "my answer was right" reports.
- **RTL**: mixed Arabic and English text in one line needs `writingDirection` per text node. English answer inputs stay LTR inside an RTL screen. Word-bank chips stay in English order.
- **Offline**: download the next 3 lessons plus their audio. Queue completions in MMKV and replay them when back online. Energy is checked on the device too; the server's number wins.
- **AI cost and safety**: hard daily caps per plan, a minute cap on calls, a cached system prompt, moderation on user input, and a teen-safe persona. Log token use in `ai_conversations`.
- **Rate limits**: per-user limits in edge functions (friend search, AI, purchases).
- **Speech**: on-device recognition quality varies by phone. Always offer "I can't speak now" (the setting in `profiles.speaking_on`).
- **Billing states**: grace period, account hold, pause and refunds all come from RTDN. Use `user_plan()` everywhere; never cache "premium" on the device for longer than the subscription's period end.
- **Content scale**: about 200 nodes × 15–20 exercises for A1→B2 is 3,000–4,000 exercises per source language. These are AI-drafted from a CEFR syllabus, then reviewed by native speakers. This is the critical path, not the code.
- **GDPR / Morocco law 09-08**: export and deletion, an EU-region Supabase project, a privacy policy, and age gating (13+ or parental consent).
- **Search**: `username` has a unique index, so prefix search uses `ilike 'q%'` with `text_pattern_ops` if needed. No search engine.

## 5. Build order

### M1: vertical slice (ugly, end to end)
Goal: a guest picks Arabic → English, does one real lesson, sees XP and a streak of 1, and the data is in Postgres.
- Screens: S01, S02, S08 (plain list of nodes), S10, S11 (3 exercise types: multiple_choice, word_bank, translate), S12, S13
- Tables: profiles, courses → exercises, user_courses, node_progress, lesson_sessions, attempts, streaks, streak_days, economy
- Routes: `/onboarding`, `/lesson/start`, `/lesson/complete`; anonymous auth
- Content: unit 1 only (5 nodes) for `en-from-ar`
- Done when: an APK on the internal track runs this loop on a real phone.

### M2: must-haves (first public beta)
- Learn: S03 daily goal, S04/S05 placement, S08 real path UI, S09 guidebook, all must-have exercise types including tap_what_you_hear and match_pairs with audio
- Retention: S14 streak calendar, freezes, S06 + reminders job, `streak_sweep`
- Economy: energy + S15 gate, gems, `/energy/refill`
- Account: S07 Google / email sign-up upgrading the guest, S19 profile, S27 settings, account deletion
- Premium: S24 paywall, Play Billing `/billing/verify` + `/billing/rtdn`, **WYADA Plus** (unlimited energy, no ads)
- i18n: full ar / fr / en with RTL; `en-from-fr` course unit 1–3
- Content: Section 1 (A1) for both courses

### M3: should-haves
- S16 leagues + `league_rollover`, S17 daily quests, S18 shop, S20 follows
- S22 Practice hub: mistakes review (Plus), words with spaced repetition
- S23 stories, speak exercises (on-device speech recognition)
- `/ai/explain` for all users
- Offline lessons and sync
- Content: A2

### M4: WYADA Max
- S26 roleplay (`/ai/roleplay/turn`), AI speaking feedback
- S25 voice call (`/ai/call/session`, streaming STT → Claude → TTS)
- Family plan
- Content: B1

### M5: could-haves
- Friend quests, monthly challenge, achievements, avatar builder, legendary levels, widget, radio lessons, streak repair, B2 content

### M6: fixes
- From the replica-entrepreneur review and beta analytics (F01 funnel drop-off, lesson completion rate, D1/D7 retention).
