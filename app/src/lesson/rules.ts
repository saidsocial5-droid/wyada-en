// Gamification rules. The server is the source of truth (supabase/migrations/*_m1_lesson_loop.sql);
// these mirror it for demo mode and for display. tests/rules.test.ts pins both to the same numbers.

export const MIN_SECONDS_PER_EXERCISE = 2;
export const lessonXp = (wrong: number) => 10 + (wrong === 0 ? 5 : 0);

/** YYYY-MM-DD in the given IANA time zone. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Streak after a lesson finished on `today`, given the last active local date. */
export function nextStreak(length: number, last: string | null, today: string): { length: number; extended: boolean } {
  if (last && last >= today) return { length, extended: false };
  if (last && last === addDays(today, -1)) return { length: length + 1, extended: true };
  return { length: 1, extended: true };
}

/** What the header shows: a streak whose last day is before yesterday is already lost. */
export function displayStreak(length: number, last: string | null, today: string): number {
  if (!last) return 0;
  return last >= addDays(today, -1) ? length : 0;
}
