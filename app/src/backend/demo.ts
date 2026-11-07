// Demo mode: runs the whole M1 loop on the device with the bundled course, no server.
// Used when no Supabase keys are configured. Mirrors the server's rules and checks.
import AsyncStorage from '@react-native-async-storage/async-storage';
import arCourse from '../../../content/en-from-ar/course.json';
import { MIN_SECONDS_PER_EXERCISE, displayStreak, lessonXp, localDate, nextStreak } from '../lesson/rules';
import { BackendError, type Backend, type CompleteInput, type Exercise, type Home, type LessonResult, type StartCourseInput, type UnitView } from './types';

type ContentExercise = { kind: Exercise['kind']; prompt: { source: string }; options?: string[]; tokens?: string[]; solutions: string[] };
type ContentCourse = { slug: string; title: string; sections: { units: { title: string; nodes: { kind: string; exercises: ContentExercise[] }[] }[] }[] };
type State = {
  courseSlug: string | null; timezone: string; dailyGoal: number;
  currentNodeId: string | null; done: string[]; totalXp: number; gems: number; energy: number;
  streak: number; lastActive: string | null; dayXp: Record<string, number>;
  results: Record<string, LessonResult>;
};
const KEY = 'wyada-demo-state-v1';
const courses: Record<string, ContentCourse> = { 'en-from-ar': arCourse as ContentCourse };

function flatten(c: ContentCourse) {
  const units: (UnitView & { nodeIds: string[] })[] = [];
  const nodes: { id: string; exercises: Exercise[] }[] = [];
  c.sections.forEach((s, si) => s.units.forEach((u, ui) => {
    const ids = u.nodes.map((n, ni) => {
      const id = `${c.slug}/s${si}/u${ui}/n${ni}`;
      nodes.push({ id, exercises: n.exercises.map((e, ei) => ({
        id: `${id}/e${ei}`, kind: e.kind, source: e.prompt.source, options: e.options ?? [], tokens: e.tokens ?? [], solutions: e.solutions })) });
      return id;
    });
    units.push({ id: `${c.slug}/s${si}/u${ui}`, title: u.title, section: si + 1, position: ui + 1, nodes: [], nodeIds: ids });
  }));
  return { units, nodes };
}

export class DemoBackend implements Backend {
  mode = 'demo' as const;
  private state: State | null = null;

  private async load(): Promise<State> {
    if (this.state) return this.state;
    let saved: State | null = null;
    try { const raw = await AsyncStorage.getItem(KEY); saved = raw ? JSON.parse(raw) : null; } catch { /* storage unavailable: start fresh */ }
    this.state = saved ?? { courseSlug: null, timezone: 'UTC', dailyGoal: 20, currentNodeId: null, done: [], totalXp: 0,
      gems: 500, energy: 25, streak: 0, lastActive: null, dayXp: {}, results: {} };
    return this.state;
  }
  private async save() { try { await AsyncStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* ignore */ } }

  async ensureSession() { await this.load(); }

  async getHome(): Promise<Home> {
    const s = await this.load();
    const today = localDate(s.timezone);
    const base = { streak: displayStreak(s.streak, s.lastActive, today), streakToday: s.lastActive === today,
      gems: s.gems, energy: s.energy, dailyGoal: s.dailyGoal, totalXp: s.totalXp, todayXp: s.dayXp[today] ?? 0 };
    const c = s.courseSlug ? courses[s.courseSlug] : null;
    if (!c) return { ...base, course: null, units: [] };
    const { units } = flatten(c);
    return { ...base, course: { slug: c.slug, title: c.title }, units: units.map(({ nodeIds, ...u }) => ({ ...u,
      nodes: nodeIds.map((id) => ({ id, kind: 'lesson' as const,
        state: s.done.includes(id) ? 'done' as const : id === s.currentNodeId ? 'current' as const : 'locked' as const })) })) };
  }

  async startCourse(i: StartCourseInput) {
    const s = await this.load();
    const c = courses[i.slug];
    if (!c) throw new BackendError('unknown', `unknown course ${i.slug}`);
    if (s.courseSlug !== i.slug) { s.courseSlug = i.slug; s.currentNodeId = flatten(c).nodes[0].id; s.done = []; }
    s.timezone = i.timezone; s.dailyGoal = i.dailyGoalXp;
    await this.save();
  }

  async getLesson(nodeId: string): Promise<Exercise[]> {
    const s = await this.load();
    const node = s.courseSlug ? flatten(courses[s.courseSlug]).nodes.find((n) => n.id === nodeId) : undefined;
    if (!node) throw new BackendError('unknown', 'unknown node');
    return node.exercises;
  }

  async completeLesson(i: CompleteInput): Promise<LessonResult> {
    const s = await this.load();
    if (s.results[i.clientSessionId]) return { ...s.results[i.clientSessionId], replayed: true };
    const { nodes } = flatten(courses[s.courseSlug!]);
    const ord = nodes.findIndex((n) => n.id === i.nodeId);
    const cur = nodes.findIndex((n) => n.id === s.currentNodeId);
    const wasDone = s.done.includes(i.nodeId);
    if (ord < 0) throw new BackendError('unknown', 'unknown node');
    if (ord > cur && !wasDone) throw new BackendError('locked', 'node locked');
    const ids = new Set(nodes[ord].exercises.map((e) => e.id));
    if (i.attempts.some((a) => !ids.has(a.exerciseId))) throw new BackendError('unknown', 'attempt for an exercise outside this lesson');
    const solved = new Set(i.attempts.filter((a) => a.isCorrect).map((a) => a.exerciseId));
    if (solved.size < ids.size) throw new BackendError('unfinished', `lesson not finished (${solved.size} of ${ids.size})`);
    if (Date.now() - Date.parse(i.startedAt) < ids.size * MIN_SECONDS_PER_EXERCISE * 1000) throw new BackendError('too_fast', 'lesson finished too fast');

    const wrong = i.attempts.filter((a) => !a.isCorrect).length;
    const xp = lessonXp(wrong);
    const today = localDate(s.timezone);
    const st = nextStreak(s.streak, s.lastActive, today);
    let next: string | null = null;
    if (!wasDone) { s.done.push(i.nodeId); if (ord >= cur && nodes[ord + 1]) { next = nodes[ord + 1].id; s.currentNodeId = next; } }
    s.totalXp += xp; s.streak = st.length; s.lastActive = s.lastActive && s.lastActive > today ? s.lastActive : today;
    s.dayXp[today] = (s.dayXp[today] ?? 0) + xp;
    const total = i.attempts.length;
    const result: LessonResult = { xp, totalXp: s.totalXp, todayXp: s.dayXp[today], correct: total - wrong, total,
      accuracy: Math.round((100 * (total - wrong)) / total), perfect: wrong === 0, streak: st.length, streakExtended: st.extended,
      nodeCompleted: true, nextNodeId: next, replayed: false };
    s.results[i.clientSessionId] = result;
    await this.save();
    return result;
  }
}
