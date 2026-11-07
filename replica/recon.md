# Recon map: Duolingo (Android) → WYADA EN

Date: 2026-11-07. Author: recon for saidsocial5-droid.

## 0. Scope

| | |
| --- | --- |
| Studied app | Duolingo, Android (`com.duolingo`) |
| Clone | **WYADA EN**: an original English-learning app with its own name, brand, mascot and course content |
| Slice | The core learning loop (path → lesson → rewards → come back tomorrow), the free-tier economy, **and the features Duolingo puts behind Super and Max**, rebuilt as WYADA EN's own premium tier |
| Platform | Android first (web build of the same codebase is optional) |
| Audience | Assumed: Arabic- and French-speaking learners of English (the Play link was `hl=fr`; the request was in Arabic). **Confirm this.** |

### Ground rules followed
- Clean room: this map records *what the app does and how users move through it*. No APK decompiling, no network capture, no private APIs, no bypassing Super/Max.
- "Premium features" means WYADA EN builds **its own** equivalents (unlimited energy, AI conversation, mistake review…). It never unlocks Duolingo's paid tier.
- Not reused: the name, the owl or other characters, the green/owl visual identity, sounds, course sentences, or the voice lines.

### Source limits on this run
The session's network blocked direct fetches of `play.google.com`, `support.duolingo.com`, `blog.duolingo.com` and `duolingo.com`. Only web search results were available, so:
- no screenshots were saved in `replica/screens/`;
- many details come from third-party write-ups and are marked **medium/low** confidence.
To raise confidence, allow those hosts in the environment's network settings, or have the user walk their own account while I take notes.

## 1. Sources

| # | source | URL | gives | confidence |
| --- | --- | --- | --- | --- |
| 1 | Play Store listing (user-supplied) | https://play.google.com/store/apps/details?id=com.duolingo | pitch, screenshots, IAP (not reachable this run) | — |
| 2 | Duolingo blog: streak habit | https://blog.duolingo.com/how-duolingo-streak-builds-habit | streak, streak freeze (up to 2 equipped) | high (official, via search snippet) |
| 3 | Duolingo blog: Duolingo 101 | https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo | onboarding, placement test | high |
| 4 | Duolingo blog: Friends Quests | https://blog.duolingo.com/friends-quests/ | co-op weekly quest with a friend | high |
| 5 | Duolingo blog: friends features | https://blog.duolingo.com/friends-social-features/ | follow, friend features | high |
| 6 | Duolingo blog: Practice Hub | https://blog.duolingo.com/guide-to-duolingo-practice-hub/ | Speak, Listen, Mistakes, Stories, Radio, Words | high |
| 7 | Duolingo blog: speaking approach | https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-speaking-skills | speaking exercises | high |
| 8 | Fan wiki: Exercise | https://duolingo.fandom.com/wiki/Exercise | exercise type catalogue | medium |
| 9 | Fan wiki: Energy | https://duolingo.fandom.com/wiki/Energy | energy system (mobile) | medium |
| 10 | Fan wiki: Streak freeze | https://duolingo.fandom.com/wiki/Shop/Streak_freeze | shop item rules | medium |
| 11 | Leagues explained | https://themarysue.com/all-duolingo-leagues-explained | 10 leagues, weekly promote/demote | medium |
| 12 | Max vs Super 2026 | https://familypro.io/en/blog/duolingo-max-vs-super | tier gating, Video Call, Roleplay | medium |
| 13 | Max review | https://storylearning.com/duolingo-max-review | Max features | medium |
| 14 | Explain My Answer free (2026) | https://gamesbeat.com/duolingo-makes-its-ai-powered-explain-my-answer-feature-free-for-all-users-in-2026/ | gating change | medium |
| 15 | Redesign coverage | https://uk.finance.yahoo.com/news/duolingo-language-learning-app-undergoes-135344395.html | path replaced skill tree | medium |
| 16 | UX redesign analysis | https://uxdesign.cc/duolingos-redesign-4-things-they-got-right-1-possible-improvement-acec8af9ec10 | path UX | medium |
| 17 | Start-lesson flow library | https://lazyweb.com/canvas/flows/duolingo/start-lesson | screen-by-screen flow | medium |

## 2. Screen inventory

`ID | screen | how you get there | purpose | key components | states to build`

| ID | screen | route | purpose | key components | states |
| --- | --- | --- | --- | --- | --- |
| S01 | Splash / welcome | app launch, signed out | pitch, start | logo, "Get started", "I have an account" | first run, offline |
| S02 | Onboarding: language & reason | S01 → Get started | pick course, motivation, source | option list, progress bar | — |
| S03 | Onboarding: daily goal | S02 | pick minutes/day | option cards (casual…intense) | — |
| S04 | Onboarding: level | S03 | start from zero or placement test | two big cards | — |
| S05 | Placement test | S04 → test | skip known units | lesson player (S11) in adaptive mode | pass, stop early, fail |
| S06 | Notifications opt-in | after first lesson | reminder time | time picker, system prompt | denied |
| S07 | Sign-up / profile creation | after first lesson ("save progress") | account | email, Google, name, age | error, existing email |
| S08 | Home: learning path | bottom nav "Learn" | the core screen | header stats bar (streak, gems, energy), section/unit banner, node path, chest nodes, story/review nodes, jump-ahead | empty (new), mid-unit, unit done, locked, offline |
| S09 | Unit guidebook | S08 unit banner → book icon | grammar tips & key phrases for the unit | phrase cards with audio | — |
| S10 | Node pop-over | tap node on S08 | start lesson / see progress / legendary | popover, "Start +10 XP", level dots | locked, completed, legendary available |
| S11 | Lesson player | S10 → Start | run exercises | progress bar, energy/hearts, prompt, answer area, word bank, mic, keyboard, Check button | idle, answered, correct sheet, wrong sheet, out of energy, quit confirm |
| S12 | Answer feedback sheet | Check on S11 | right/wrong + correct answer | bottom sheet, "Explain my answer", report, Continue | correct, wrong, typo-accepted |
| S13 | Lesson complete | end of S11 | rewards | XP, accuracy, time, combo, streak increment animation, quest progress | perfect lesson, first lesson of day |
| S14 | Streak screen | header flame | streak calendar, freezes | calendar, freeze count, milestone, repair offer | broken, frozen, milestone |
| S15 | Out of energy / hearts | energy hits 0 in S11 | gate | refill with gems, wait timer, practice to earn, upgrade CTA | — |
| S16 | Leaderboard (leagues) | bottom nav "Leagues" | weekly XP ranking | league badge, ranked list, promotion/demotion zones, countdown | not unlocked yet, promoted, demoted |
| S17 | Quests | bottom nav "Quests" | daily + friend + monthly quests | quest cards with progress bars, chest rewards, monthly badge | all done, friend quest pending |
| S18 | Shop | bottom nav / gems icon | spend gems | item cards (refill, freeze, timer boosts, XP boost), gem balance | insufficient gems |
| S19 | Profile | bottom nav "Profile" | stats & social | avatar, joined date, following/followers, streak, total XP, league, achievements | own vs other user, private |
| S20 | Friends / add friends | S19 | follow, find contacts | search, suggestions, invite link | none found |
| S21 | Achievements | S19 | badges | badge grid with tiers | locked |
| S22 | Practice hub | bottom nav "Practice" | targeted review | tiles: Mistakes, Words, Speak, Listen, Stories, Radio | premium-locked tiles, nothing to review |
| S23 | Story player | S22 or path story node | short interactive dialogue | dialogue bubbles with audio, comprehension questions | — |
| S24 | Paywall / upgrade | many CTAs | sell premium | plan cards (monthly/annual/family), free trial, comparison table | trial active, already premium |
| S25 | AI Video Call | S22 / path (premium+) | spoken conversation with AI character | character video/avatar, live captions, mic, end call, recap | mic denied, network drop |
| S26 | AI Roleplay | path node (premium+) | scenario chat | chat bubbles, mic/keyboard, hint, feedback report | — |
| S27 | Settings | S19 gear | account & prefs | sound, haptics, speaking/listening toggles, notifications, daily goal, privacy, subscription | — |
| S28 | Widget / notifications | Android home screen | reminders | streak widget, reminder push | — |
| S29 | Ad interstitial | after lesson (free) | revenue | full-screen ad, skip | — (WYADA EN: optional) |

29 screens.

## 3. User flows

```
F01 New learner finishes first lesson
    S01 -> S02 -> S03 -> S04 -> S08 -> S10 -> S11 (x ~12 exercises) -> S12 -> S13 -> S06 -> S07
    happy path: ~9 taps before first exercise (target for WYADA EN: 6)
    edge: skip sign-up, mic unavailable, offline after onboarding

F02 Daily return (the core loop)
    push/widget S28 -> S08 -> S10 -> S11 -> S13 -> S14 (streak +1) -> S17 (quest ticks)
    happy path: 3 taps to first exercise
    edge: streak about to break at 23:59 local, timezone change, freeze consumed

F03 Placement test
    S04 -> S05 -> S08 (jumped to unit N)
    edge: user quits mid-test, placement cannot be undone

F04 Mistake → explanation
    S11 -> S12 (wrong) -> "Explain my answer" -> AI explanation -> S11
    edge: typo tolerance, multiple correct answers, report a wrong answer

F05 Out of energy
    S11 -> S15 -> (gems refill | practice to earn | wait | S24 upgrade)
    edge: zero gems, premium user never sees S15

F06 Weekly league
    S13 (XP) -> S16 ranking -> week end -> promoted/demoted modal
    edge: tie on XP, user inactive, league unlocks after first lessons

F07 Streak protection
    S18 buy freeze -> missed day -> freeze auto-used -> S14 shows frozen day
    edge: max 2 equipped, repair after break (paid), streak milestones

F08 Friend quest
    S20 follow friend -> weekly auto-pairing -> S17 shared progress bar -> chest
    edge: friend inactive, opt-out in settings

F09 Practice mistakes (premium)
    S22 -> Mistakes -> S11 (review mode) -> S13
    edge: empty mistakes list

F10 AI video call (premium+)
    S22 / path -> S25 call -> recap with feedback -> XP
    edge: mic denied, poor network, inappropriate input handling

F11 AI roleplay (premium+)
    path node -> S26 -> report card
F12 Upgrade
    any CTA -> S24 -> Google Play Billing -> premium state everywhere
    edge: trial cancel, restore purchase, family plan invite
F13 Legendary level
    S10 (completed node) -> legendary -> S11 no hints, strict errors -> gold node
```

13 flows.

## 4. Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Primary button (chunky 3D) | primary, secondary, danger, premium, ghost | default, pressed (sinks), disabled, loading | everywhere |
| Option card | single-select, multi-select, with icon | idle, selected, correct, wrong | S02–S04, S11 |
| Progress bar | lesson, quest, XP, unit | animated fill, complete | S11, S13, S17, S08 |
| Stats header | streak, gems, energy/hearts, course flag | count-up animation, empty, infinite (premium) | S08, S16, S17, S22 |
| Path node | lesson, story, review, chest, legendary, unit test | locked, current (bouncing), in-progress (ring), done, gold | S08 |
| Unit banner | section colour per unit | sticky header | S08 |
| Popover | node popover | open/close | S10 |
| Word bank chip | word token | in bank, placed, disabled, hint | S11 |
| Mic button | hold/tap to speak | idle, listening (waveform), processing, can't talk now | S11, S25, S26 |
| Audio button | normal, slow (turtle) | playing | S11, S09, S23 |
| Text input | translation box | focused, error, accepted with typo | S11 |
| Feedback bottom sheet | correct, wrong, typo | with/without explain | S12 |
| Character speech bubble | mascot / cast member | animated | S11, S23, S26 |
| Reward modal | XP, gems, chest, league promo, streak milestone | celebration animation | S13, S14, S16, S17 |
| Calendar | streak calendar | done, frozen, missed, today | S14 |
| Leaderboard row | rank, avatar, name, XP | promote zone, demote zone, self | S16 |
| Quest card | daily, friend, monthly | progress, done, claimable | S17 |
| Shop item card | consumable, boost, premium | affordable, unaffordable, owned | S18 |
| Bottom nav | 5 tabs | active, badge dot | main shell |
| Plan card | monthly, annual, family | selected, best value tag | S24 |
| Toast / snackbar | info, error | — | global |
| Modal dialog | confirm quit, permission | — | S11, S06 |
| Avatar | builder-generated | — | S19, S16 |

## 5. Inferred data model

```
User           id, display_name, username, email, auth_provider, avatar (json), created_at,
               timezone, ui_language, daily_goal_xp, notification_time, privacy
               evidence: S07, S19, S27, S03   confidence: high

Course         id, from_language, to_language ("en"), title, version
               evidence: S02, multi-course switching (flag in header)   confidence: high

Section        id, course_id, order, title, cefr_level (A1..B2)
Unit           id, section_id, order, title, colour, guidebook (json)
               evidence: S08 banners, S09 guidebook   confidence: high (structure), medium (CEFR tag)

PathNode       id, unit_id, order, type (lesson|story|review|chest|unit_test|legendary|roleplay),
               levels_required
               evidence: S08 node kinds   confidence: medium

Exercise       id, node_id, type (translate|word_bank|tap_what_you_hear|listen_type|match_pairs|
               speak|select_image|fill_blank|dialogue|read_respond),
               prompt (json), solutions [text], audio_url, image_url, tokens [text], difficulty
               evidence: source 8, S11   confidence: medium (type list), guess (field names)

UserCourse     user_id, course_id, current_node_id, placement_unit_id, total_xp
UserNodeProgress user_id, node_id, level_done, legendary (bool), completed_at
LessonSession  id, user_id, node_id, mode (normal|practice|legendary|placement|mistakes),
               started_at, ended_at, xp_earned, accuracy, combo_max, energy_spent
Attempt        id, session_id, exercise_id, answer, correct (bool), typo (bool), time_ms
               evidence: S13 stats, F04, F09   confidence: high (concept), guess (shape)

Mistake        user_id, exercise_id, last_wrong_at, times_wrong, resolved (bool)   → feeds S22 Mistakes
Word           id, course_id, text, translation, audio_url; UserWord user_id, word_id, strength, next_review_at
               evidence: Practice hub "Words"; spaced repetition per redesign coverage   confidence: medium

Streak         user_id, current_length, longest, last_active_date (local), freezes_equipped (≤2)
StreakDay      user_id, date, status (done|frozen|missed)
               evidence: source 2, 10, S14   confidence: high

Wallet         user_id, gems
EnergyState    user_id, energy (0..max), last_refill_at
               evidence: sources 9, 12   confidence: medium (exact numbers unknown; make them config)
ShopItem / Purchase   item_id, price_gems, effect; user_id, item_id, bought_at

League         tier (1..10), name
LeagueCohort   id, tier, week_start, size (~30, guess)
CohortMember   cohort_id, user_id, week_xp, final_rank, result (promoted|stayed|demoted)
               evidence: source 11, S16   confidence: high (10 tiers, weekly), guess (size)

Quest          id, kind (daily|friend|monthly), metric (xp|lessons|perfect|minutes), target, reward
UserQuest      user_id, quest_id, period_start, progress, claimed
FriendQuestPair  week_start, user_a, user_b, progress
               evidence: source 4, S17   confidence: high

Follow         follower_id, followee_id, created_at
Achievement / UserAchievement   id, tier thresholds; user_id, achievement_id, tier

Subscription   user_id, plan (free|plus|max), period (month|year), family_group_id,
               play_purchase_token, status (trial|active|grace|cancelled|expired), renews_at
               evidence: S24, source 12   confidence: high

AiConversation id, user_id, kind (video_call|roleplay|explain), scenario_id, started_at,
               transcript (json), feedback (json), tokens_used
               evidence: sources 12–14, S25, S26   confidence: medium
```

## 6. Premium mapping (studied app → WYADA EN)

Duolingo's tiers as reported by public sources (medium confidence; prices vary by country, so check the in-app paywall):

| studied app gates | where | WYADA EN plan |
| --- | --- | --- |
| Unlimited energy/hearts | Super | **WYADA Plus** |
| No ads | Super | Plus (or no ads for anyone) |
| Practice Hub: Mistakes review, personalised practice | Super | Plus |
| Unlimited legendary attempts | Super | Plus |
| Family plan (up to 6) | Super / Max | Plus Family |
| Explain My Answer (AI) | was Max, reported free from 2026 | **Free** (a differentiator) |
| Roleplay (AI scenario chat) | Max | **WYADA Max** |
| Video Call with an AI character | Max | Max |
| AI-graded speaking feedback | Max | Max |

## 7. Out of scope / cannot clone

| item | reason |
| --- | --- |
| Duolingo name, owl mascot, character cast, look, sounds | trademarks and copyrighted art. WYADA EN designs its own |
| Course sentences, audio, stories, guidebooks | owned content. WYADA EN writes or generates its own English course |
| Duolingo's user base, leagues full of real users, friends graph | network effect. Seed leagues with real users only. Never fake users presented as real |
| Learning/difficulty models trained on their data (e.g. Birdbrain) | data they own. Start with simple spaced repetition |
| Duolingo English Test certification | regulated/recognised credential |
| Math, Music, Chess courses | outside the slice (English only) |
| Unlocking Duolingo Super/Max for free, APK mods | not done, ever. Premium is WYADA EN's own tier, sold through Google Play Billing |

## 8. Size

- 29 screens, 13 flows, ~25 entities.
- Hard parts:
  1. **Course content**: a full A1→B2 English path with exercises, audio and stories is the biggest job. It has to be written or AI-generated, then reviewed by a person.
  2. **Speech & AI**: speech recognition for speaking exercises, plus real-time AI voice conversation for Video Call and Roleplay (latency, cost per minute, safety filtering).
  3. **Gamification correctness**: streaks across time zones, energy timers, weekly league cohorts with promotion and demotion, and quests, all server-authoritative so they can't be cheated.
  4. Also: Google Play Billing with subscription states and family plans, offline lessons with sync, push and widgets.
- Size: **L (a quarter)** for the full set. **M (a few weeks)** for a first release: path + lesson player + XP/streak/energy + paywall with Plus.
