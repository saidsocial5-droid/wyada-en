import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { newId, useBackend, type Attempt, type Exercise } from '../../backend';
import { checkAnswer, hasNonLatin } from '../../lesson/check';
import { layout, space, useTheme } from '../../theme';
import { Button, ConfirmDialog, FeedbackSheet, OptionCard, ProgressBar, Screen, SpeechBubble, Text, TextField, Toast, WordChip, type FeedbackKind, type OptionState } from '../../ui';

/** Stable shuffle per exercise, so options don't jump on re-render but aren't in content order. */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

type Feedback = { kind: FeedbackKind; expected: string };

/** S11 lesson player + S12 feedback. Wrong answers come back at the end of the lesson. */
export default function Lesson() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const backend = useBackend();
  const { c, t } = useTheme();

  const [exs, setExs] = useState<Exercise[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [queue, setQueue] = useState<number[]>([]);
  const [solved, setSolved] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [fieldError, setFieldError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const attempts = useRef<Attempt[]>([]);
  const startedAt = useRef(new Date().toISOString());
  const shownAt = useRef(Date.now());
  const sessionId = useRef(newId());

  useEffect(() => {
    backend.getLesson(nodeId).then((e) => { setExs(e); setQueue(e.map((_, i) => i)); shownAt.current = Date.now(); })
      .catch(() => setLoadFailed(true));
  }, [backend, nodeId]);

  const ex = exs && queue.length ? exs[queue[0]] : null;
  const options = useMemo(() => (ex ? shuffled(ex.options, ex.id) : []), [ex]);
  const bank = useMemo(() => (ex ? shuffled(ex.tokens, ex.id) : []), [ex]);
  const answer = !ex ? '' : ex.kind === 'multiple_choice' ? (choice == null ? '' : options[choice])
    : ex.kind === 'word_bank' ? placed.map((i) => bank[i]).join(' ') : typed;

  const finish = async () => {
    setSaving(true); setSaveFailed(false);
    try {
      const r = await backend.completeLesson({ clientSessionId: sessionId.current, nodeId, startedAt: startedAt.current, attempts: attempts.current });
      router.replace({ pathname: '/lesson-complete', params: { r: JSON.stringify(r) } });
    } catch { setSaveFailed(true); setSaving(false); } // same session id on retry: the server won't count it twice
  };

  const check = () => {
    if (!ex || !answer.trim()) return;
    if (ex.kind === 'translate_to_en' && hasNonLatin(answer)) { setFieldError(true); return; }
    const r = checkAnswer(answer, ex.solutions);
    attempts.current.push({ exerciseId: ex.id, answer, isCorrect: r.correct, hadTypo: r.typo, timeMs: Date.now() - shownAt.current });
    setFeedback({ kind: !r.correct ? 'wrong' : r.typo ? 'typo' : 'correct', expected: r.expected });
  };

  const next = () => {
    const ok = feedback?.kind !== 'wrong';
    const rest = ok ? queue.slice(1) : [...queue.slice(1), queue[0]];
    if (ok) setSolved((s) => s + 1);
    setFeedback(null); setChoice(null); setPlaced([]); setTyped(''); setFieldError(false);
    shownAt.current = Date.now();
    setQueue(rest);
    if (rest.length === 0) void finish();
  };

  if (loadFailed) return (
    <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], padding: space[6] }}>
      <Text center>{t('loadError')}</Text><Button label={t('close')} onPress={() => router.back()} full={false} />
    </View></Screen>);

  if (!exs) return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.accent} size="large" /></View></Screen>;

  const locked = feedback != null;
  const optionState = (i: number): OptionState => {
    if (!feedback) return choice === i ? 'selected' : 'idle';
    if (ex && ex.solutions.includes(options[i])) return 'correct';
    return choice === i ? 'wrong' : 'disabled';
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: layout.gutter, height: layout.header }}>
        <Pressable testID="quit" accessibilityRole="button" accessibilityLabel={t('quitTitle')} onPress={() => setQuitOpen(true)}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><X color={c['text-muted']} size={28} /></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={solved / exs.length} label="lesson progress" /></View>
      </View>

      {ex ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: layout.gutter, gap: space[6], maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
          <Text size="xl" weight={700}>{t(ex.kind === 'multiple_choice' ? 'chooseTranslation' : ex.kind === 'word_bank' ? 'buildSentence' : 'writeInEnglish')}</Text>
          <SpeechBubble text={ex.source} />

          {ex.kind === 'multiple_choice' && (
            <View style={{ gap: space[3] }}>
              {options.map((o, i) => (
                <OptionCard key={o} testID={`option-${i}`} index={i + 1} label={o} latin state={optionState(i)} onPress={locked ? undefined : () => setChoice(i)} />))}
            </View>)}

          {ex.kind === 'word_bank' && (
            <View style={{ gap: space[6], direction: 'ltr' }}>
              <View testID="answer-line" style={{ minHeight: 60, borderBottomWidth: 2, borderBottomColor: c.border, flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingBottom: space[2] }}>
                {placed.map((ti) => <WordChip key={ti} word={bank[ti]} state="placed" onPress={locked ? undefined : () => setPlaced((p) => p.filter((x) => x !== ti))} />)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' }}>
                {bank.map((w, ti) => (
                  <WordChip key={ti} testID={`chip-${w}`} word={w} state={placed.includes(ti) ? 'used' : 'bank'}
                    onPress={locked ? undefined : () => setPlaced((p) => [...p, ti])} />))}
              </View>
            </View>)}

          {ex.kind === 'translate_to_en' && (
            <TextField testID="answer-input" placeholder={t('typeHere')} value={typed} editable={!locked}
              onChangeText={(v) => { setTyped(v); setFieldError(false); }} error={fieldError ? t('fieldError') : undefined} />)}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], padding: space[6] }}>
          {saveFailed ? <><Toast tone="offline" text={t('saveError')} /><Button testID="retry-save" label={t('retry')} onPress={finish} full={false} /></>
            : <ActivityIndicator color={c.accent} size="large" />}
        </View>
      )}

      {ex && (feedback ? (
        <FeedbackSheet kind={feedback.kind} answer={feedback.kind === 'correct' ? undefined : feedback.expected} onContinue={next} showExplain={false} />
      ) : (
        <View style={{ padding: layout.gutter, borderTopWidth: 2, borderTopColor: c.border }}>
          <Button testID="check" label={t('check')} disabled={!answer.trim() || saving} onPress={check} />
        </View>
      ))}

      <ConfirmDialog visible={quitOpen} title={t('quitTitle')} body={t('quitBody')} confirm={t('quitConfirm')} cancel={t('keepLearning')}
        destructive onCancel={() => setQuitOpen(false)} onConfirm={() => { setQuitOpen(false); router.back(); }} />
    </Screen>
  );
}
