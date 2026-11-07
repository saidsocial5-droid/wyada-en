# WYADA EN: component specs

Tokens: `tokens.json` → `node replica/design/build-tokens.mjs` → `tokens.css`, `tailwind.preset.cjs`, `app/src/theme/tokens.ts`.
Contrast: `python3 replica/design/contrast.py replica/design/tokens.json`. 68 checks, 0 failures (WCAG AA, light and dark).
Code: `app/src/ui/*`. Live page: `/design` route (`?lang=ar|fr|en&theme=light|dark`). Screenshots: `replica/design/preview/`.

## Global rules

- **Never a raw hex in a component.** Use roles only: `c.accent`, `c['text-muted']`… The only exceptions are white glyphs on filled icons and the `#00000033`-style edge tints.
- **Every text goes through `<Text>`.** It applies the token size, the Arabic line height (×1.15) and the RTL alignment. Pass `latin` for English content (answers, word bank, the course sentences), so it stays LTR inside an Arabic screen.
- **Direction**: the screen root sets `direction` (native) or `dir` (web). Rows flip by themselves, so never use `row-reverse` to fake RTL. Containers for English answers force `direction: 'ltr'`.
- **Tap targets ≥ 48 px**, except small buttons, which are 40 px with 4 px of extra hit slop when added to screens.
- **3D press**: a solid bottom edge (`depth.edge-*`) in the `*-edge` colour. Pressed = no edge, plus `translateY(edge)`. With Reduce Motion on, the press stays but celebrations become fades.
- **Feedback** is never colour-only: an icon and words always come with green or red.
- **Icons**: Lucide (ISC). **Mascot and characters**: original art to commission. Placeholder slots are marked "character art".

## Components

| # | component | file | built |
| --- | --- | --- | --- |
| 1 | Button | Button.tsx | ✅ |
| 2 | OptionCard | Controls.tsx | ✅ |
| 3 | ProgressBar | Controls.tsx | ✅ |
| 4 | StatsHeader | Gamification.tsx | ✅ |
| 5 | PathNode | Gamification.tsx | ✅ |
| 6 | UnitBanner | Gamification.tsx | ✅ |
| 7 | NodePopover | — | spec |
| 8 | WordChip | Controls.tsx | ✅ |
| 9 | MicButton | Controls.tsx | ✅ |
| 10 | AudioButton | Controls.tsx | ✅ |
| 11 | TextField | Controls.tsx | ✅ |
| 12 | FeedbackSheet | Feedback.tsx | ✅ |
| 13 | SpeechBubble | Feedback.tsx | ✅ |
| 14 | RewardModal | — | spec |
| 15 | StreakWeek / StreakCalendar | Gamification.tsx | ✅ week · month spec |
| 16 | LeaderboardRow | Gamification.tsx | ✅ |
| 17 | QuestCard | Gamification.tsx | ✅ |
| 18 | ShopItemCard | Gamification.tsx | ✅ |
| 19 | BottomNav | Feedback.tsx | ✅ |
| 20 | PlanCard | Gamification.tsx | ✅ |
| 21 | Toast | Feedback.tsx | ✅ |
| 22 | ConfirmDialog | — | spec |
| 23 | Avatar | Gamification.tsx | ✅ initials · builder spec |

---

```
Button
  variants  primary (accent), secondary (outlined), reward (saffron: upgrades, claims), success, danger, ghost
  sizes     sm 40px, md 48px, lg 56px; full width by default
  states    default, pressed (sinks by edge), focus-visible (2px focus-ring, offset 2), disabled (sunken bg, text-disabled, no edge), loading (spinner; label kept for screen readers)
  tokens    bg <variant>, edge <variant>-edge, text on-<variant>, radius lg, font size/700 uppercase (Latin only)
  a11y      role button, accessibilityState disabled/busy, label = visible label
  used on   S01–S07, S11–S13, S15, S17, S18, S24, everywhere
```

```
OptionCard
  variants  plain, with number key (1–3, keyboard shortcut on web/tablet), with hint line
  states    idle, selected (accent-soft + accent border), correct (success-soft + check icon), wrong (danger-soft + cross icon), disabled, pressed
  tokens    radius lg, border 2 + edge-sm, min height 56
  a11y      role radio inside a radiogroup; state never shown by colour alone
  used on   S02, S03, S04, S11 (multiple_choice, select_image without image)
```

```
ProgressBar
  tones     success (lesson), reward (quests), accent (XP / daily goal)
  states    0–100 %, complete (adds a short shine animation), fills from the reading-start side (right in Arabic)
  tokens    track surface-sunken, height 16 lesson / 14 quest, radius pill, highlight stripe white at 30 %
  a11y      role progressbar with min/max/now
  used on   S11, S13, S17, S08 (unit progress)
```

```
StatsHeader
  items     course flag, streak (grey until today's lesson, then streak orange), gems, energy (∞ icon on Plus/Max)
  states    loading (skeleton numbers), count-up after a lesson, offline (dims numbers + toast)
  tokens    icon-streak, icon-gem, icon-energy; height 56; bottom border 2
  a11y      each item is a 48px button that opens its sheet (S14, S18, S15); label "streak 12 days"
  used on   S08, S16, S17, S22
```

```
PathNode
  kinds     lesson (star), story (book), review (dumbbell), chest (gift), unit_test (trophy), roleplay (chat, Max)
  states    locked (locked/on-locked + lock), current ("Start" tag + accent-soft ring; gentle bounce unless Reduce Motion), in_progress (ring fills by level 0–100 %), done (check), legendary (reward gold + crown)
  layout    72px button on an 88px ring; nodes zig-zag with marginStart 0/96/128/96/0, which mirrors in RTL
  tokens    unit colour per unit (unit-1..6), edge 6px black at 22 %
  a11y      label "lesson 3 of unit 1, in progress"; locked nodes are focusable and explain why they are locked
  used on   S08
```

```
UnitBanner
  content   "Unit <section> · <n>", unit title, guidebook button (48px)
  states    sticky at top of the path while its unit is on screen
  tokens    unit-N fill, on-unit-N text, radius lg, edge-md
  a11y      role header
  used on   S08, S09
```

```
NodePopover (spec)
  content   node title, "Lesson 2/4", primary Start +XP button; legendary variant shows gem/Plus cost; locked variant shows "Finish the previous lessons first" plus a jump-ahead test button
  behaviour anchored under the node, arrow points at it; closes on outside tap / back
  tokens    surface (or unit fill for the current node), radius lg, shadow md
  a11y      focus moves into the popover; Escape/back closes it
  used on   S10
```

```
WordChip
  states    bank, placed (in the answer line), used (keeps its slot as an empty sunken block so the bank doesn't jump), hint (accent-soft), pressed
  behaviour tap moves bank ↔ answer line with a 200ms slide; always LTR English
  tokens    height 44, radius md, border 2 + edge-sm
  a11y      role button, label = word; the answer line announces "answer: Thank you"
  used on   S11 (word_bank, tap_what_you_hear)
```

```
MicButton
  states    idle, listening (accent-soft + live waveform), processing (busy), unavailable (mic permission denied or "can't speak now": disabled with reason)
  behaviour hold to talk (also tap-to-toggle setting); "I can't speak now" link under it skips speaking for 1 hour
  a11y      label changes with state; result announced politely
  used on   S11 (speak), S25, S26
```

```
AudioButton
  variants  normal (speaker), slow (snail); lg 72px for prompts, md 52px secondary
  states    idle, playing (darker fill), pressed
  a11y      label "Play audio" / "Play slowly"
  used on   S09, S11, S23
```

```
TextField (answer input)
  states    empty (placeholder in UI language), focused (2px focus ring), filled, error (danger border + message below, announced)
  behaviour multiline, LTR, English keyboard hint; non-Latin input shows "Write your answer in English letters"
  tokens    bg surface-sunken, border border-input (3:1), radius lg, font lg
  used on   S11 (translate_to_en, listen_type), S07 (single-line variant)
```

```
FeedbackSheet
  kinds     correct, typo (counted correct; shows the right spelling), wrong (shows the correct answer)
  content   icon + title, answer (LTR), "Explain my answer" (AI, wrong/typo only), report flag, Continue
  behaviour slides up from the bottom over the lesson footer; plays a short sound if sound is on
  tokens    success-soft / danger-soft bg, on-*-soft text, button success/danger
  a11y      role alert, live region assertive; focus moves to Continue
  used on   S12
```

```
SpeechBubble
  content   character art slot (original WYADA cast) + bubble with the prompt
  tokens    surface, border 2, radius lg; text lg
  used on   S11, S23, S26
```

```
RewardModal (spec)
  kinds     lesson complete (XP, accuracy, time tiles), streak milestone, chest gems, league promotion, quest complete
  behaviour full screen on bg, illustration + count-up numbers; confetti only without Reduce Motion; one primary Continue
  a11y      announces the result in one sentence
  used on   S13, S14, S16, S17
```

```
StreakWeek / StreakCalendar
  day states done (streak fill + flame), frozen (gem fill + snowflake), missed (dot), today (outlined), future (sunken)
  month     same cells in a 7-column grid with month navigation (spec)
  a11y      each day labelled "Wed, frozen"
  used on   S14, S13
```

```
LeaderboardRow
  states    normal, self (accent-soft), promotion zone (rank in success), demotion zone (rank in danger), top 3 (medal icon, spec)
  tokens    min height 64, radius md
  a11y      one label per row: "2. You, 980 XP"
  used on   S16
```

```
QuestCard
  states    in progress, complete-claimable (reward Claim button), claimed (spec: check + muted), friend quest (two avatars + shared bar, spec)
  used on   S17, S13
```

```
ShopItemCard
  states    affordable, unaffordable (price dimmed, disabled), owned/equipped count (e.g. freeze 1/2), premium-included (spec: "Included in Plus")
  used on   S18, S15
```

```
BottomNav
  tabs      Learn, Practice, Leagues, Quests, Profile
  states    active (accent-soft tile + accent icon), inactive, badge dot (danger)
  tokens    height 64, top border 2
  a11y      role tablist / tab with selected state; labels from i18n (icons only on screen)
  used on   main shell
```

```
PlanCard
  variants  monthly, annual (badge "Best value" in reward), family (spec)
  states    idle, selected
  content   price comes from Google Play (localised, e.g. MAD/EUR); never hard-coded
  a11y      role radio
  used on   S24
```

```
Toast
  tones     info (inverted: text bg on bg text), offline (warning-soft)
  behaviour bottom, above nav; auto-hide 3s; one at a time
  a11y      live region polite
  used on   global
```

```
ConfirmDialog (spec)
  use       "Quit the lesson? You'll lose your progress in it", notifications pre-prompt, delete account
  states    default, destructive (danger primary)
  a11y      focus trapped, back closes
  used on   S11, S06, S27
```

```
Avatar
  now       initials on a unit colour, deterministic per name
  later     avatar builder output (original parts), sizes 40 / 64 / 96
  used on   S16, S19, S20
```

## Checked on screen

On the `/design` page in Arabic (light) and French (dark), rendered with web export + Chromium at 400 px:
- RTL mirrors the header, nav and path zig-zag; English answers stay LTR; Arabic line height is readable.
- No page errors.
- Fixed after review: the in-progress ring track was invisible in dark mode, and the current node looked identical to a finished one.

Not checked yet: a real Android device (native font loading, `I18nManager` RTL restart, TalkBack). This happens in M1.
