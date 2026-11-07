export type ExerciseKind = 'multiple_choice' | 'word_bank' | 'translate_to_en';
export type Exercise = { id: string; kind: ExerciseKind; source: string; options: string[]; tokens: string[]; solutions: string[] };
export type NodeState = 'locked' | 'current' | 'done';
export type PathNodeView = { id: string; kind: 'lesson' | 'story' | 'review' | 'chest' | 'unit_test' | 'roleplay'; state: NodeState };
export type UnitView = { id: string; title: string; section: number; position: number; nodes: PathNodeView[] };
export type Home = {
  course: { slug: string; title: string } | null;
  units: UnitView[];
  streak: number; streakToday: boolean; gems: number; energy: number;
  totalXp: number; todayXp: number; dailyGoal: number;
};
export type Attempt = { exerciseId: string; answer: string; isCorrect: boolean; hadTypo: boolean; timeMs: number };
export type CompleteInput = { clientSessionId: string; nodeId: string; startedAt: string; attempts: Attempt[] };
export type LessonResult = {
  xp: number; totalXp: number; todayXp: number; correct: number; total: number; accuracy: number; perfect: boolean;
  streak: number; streakExtended: boolean; nodeCompleted: boolean; nextNodeId: string | null; replayed: boolean;
};
export type StartCourseInput = { slug: string; timezone: string; dailyGoalXp: number; uiLanguage: 'ar' | 'fr' | 'en' };

export interface Backend {
  mode: 'demo' | 'supabase';
  ensureSession(): Promise<void>;
  getHome(): Promise<Home>;
  startCourse(input: StartCourseInput): Promise<void>;
  getLesson(nodeId: string): Promise<Exercise[]>;
  /** Idempotent on clientSessionId: retry with the same id after a network error. */
  completeLesson(input: CompleteInput): Promise<LessonResult>;
}

export class BackendError extends Error {
  constructor(public code: 'locked' | 'unfinished' | 'too_fast' | 'auth' | 'network' | 'unknown', message: string) { super(message); }
}

/** Map a server error message to a code the UI can act on. */
export function classify(message: string): BackendError['code'] {
  if (/node locked/.test(message)) return 'locked';
  if (/not finished/.test(message)) return 'unfinished';
  if (/too fast/.test(message)) return 'too_fast';
  if (/not signed in|JWT/i.test(message)) return 'auth';
  if (/network|fetch|Failed to fetch/i.test(message)) return 'network';
  return 'unknown';
}
