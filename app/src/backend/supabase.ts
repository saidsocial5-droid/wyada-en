import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { displayStreak, localDate } from '../lesson/rules';
import { BackendError, classify, type Backend, type CompleteInput, type Exercise, type Home, type LessonResult, type StartCourseInput, type UnitView } from './types';

type NodeRow = { id: string; position: number; kind: UnitView['nodes'][number]['kind'] };
type UnitRow = { id: string; position: number; title: string; path_nodes: NodeRow[] };
type SectionRow = { position: number; units: UnitRow[] };

export class SupabaseBackend implements Backend {
  mode = 'supabase' as const;
  private db: SupabaseClient;
  constructor(url: string, anonKey: string) {
    this.db = createClient(url, anonKey, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  private fail(e: { message: string } | null): asserts e is null {
    if (e) throw new BackendError(classify(e.message), e.message);
  }

  private async uid(): Promise<string> {
    const { data } = await this.db.auth.getSession();
    if (!data.session) throw new BackendError('auth', 'no session');
    return data.session.user.id;
  }

  async ensureSession() {
    const { data } = await this.db.auth.getSession();
    if (data.session) return;
    const { error } = await this.db.auth.signInAnonymously(); // guest first, sign-up later (F01)
    this.fail(error);
  }

  async getHome(): Promise<Home> {
    const uid = await this.uid();
    const [uc, profile, streak, economy] = await Promise.all([
      this.db.from('user_courses').select('course_id, current_node_id, total_xp, courses(slug, title)').eq('is_active', true).maybeSingle(),
      this.db.from('profiles').select('timezone, daily_goal_xp').eq('id', uid).single(),
      this.db.from('streaks').select('current_length, last_active_date').eq('user_id', uid).single(),
      this.db.from('economy').select('gems, energy').eq('user_id', uid).single(),
    ]);
    this.fail(uc.error); this.fail(profile.error); this.fail(streak.error); this.fail(economy.error);
    const today = localDate(profile.data.timezone);
    const base = {
      streak: displayStreak(streak.data.current_length, streak.data.last_active_date, today),
      streakToday: streak.data.last_active_date === today,
      gems: economy.data.gems, energy: economy.data.energy, dailyGoal: profile.data.daily_goal_xp,
    };
    if (!uc.data) return { ...base, course: null, units: [], totalXp: 0, todayXp: 0 };

    const [sections, progress, day] = await Promise.all([
      this.db.from('sections').select('position, units(id, position, title, path_nodes(id, position, kind))').eq('course_id', uc.data.course_id),
      this.db.from('node_progress').select('node_id, completed_at').eq('user_id', uid),
      this.db.from('streak_days').select('xp').eq('user_id', uid).eq('local_date', today).maybeSingle(),
    ]);
    this.fail(sections.error); this.fail(progress.error); this.fail(day.error);
    const done = new Set(progress.data.filter((p) => p.completed_at).map((p) => p.node_id));
    const units: UnitView[] = (sections.data as SectionRow[])
      .sort((a, b) => a.position - b.position)
      .flatMap((s) => [...s.units].sort((a, b) => a.position - b.position).map((u) => ({
        id: u.id, title: u.title, section: s.position, position: u.position,
        nodes: [...u.path_nodes].sort((a, b) => a.position - b.position).map((n) => ({
          id: n.id, kind: n.kind,
          state: done.has(n.id) ? 'done' as const : n.id === uc.data!.current_node_id ? 'current' as const : 'locked' as const,
        })),
      })));
    const course = uc.data.courses as unknown as { slug: string; title: string };
    return { ...base, course, units, totalXp: uc.data.total_xp, todayXp: day.data?.xp ?? 0 };
  }

  async startCourse(i: StartCourseInput) {
    const { error } = await this.db.rpc('start_course', {
      p_course_slug: i.slug, p_timezone: i.timezone, p_daily_goal_xp: i.dailyGoalXp, p_ui_language: i.uiLanguage,
    });
    this.fail(error);
  }

  async getLesson(nodeId: string): Promise<Exercise[]> {
    const { data, error } = await this.db.from('exercises').select('id, kind, prompt, solutions, tokens, level, position')
      .eq('node_id', nodeId).eq('level', 1).order('position'); // M1: every node has one level
    this.fail(error);
    return data.map((e) => ({ id: e.id, kind: e.kind, source: e.prompt.source, options: e.prompt.options ?? [], tokens: e.tokens, solutions: e.solutions }));
  }

  async completeLesson(i: CompleteInput): Promise<LessonResult> {
    const { data, error } = await this.db.rpc('complete_lesson', {
      p_client_session_id: i.clientSessionId, p_node_id: i.nodeId, p_started_at: i.startedAt,
      p_attempts: i.attempts.map((a) => ({ exercise_id: a.exerciseId, answer: a.answer, is_correct: a.isCorrect, had_typo: a.hadTypo, time_ms: a.timeMs })),
    });
    this.fail(error);
    return {
      xp: data.xp, totalXp: data.total_xp, todayXp: data.today_xp, correct: data.correct, total: data.total,
      accuracy: Number(data.accuracy), perfect: data.perfect, streak: data.streak, streakExtended: data.streak_extended,
      nodeCompleted: data.node_completed, nextNodeId: data.next_node_id, replayed: data.replayed,
    };
  }
}
