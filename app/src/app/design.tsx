import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { layout, radius, space, useTheme } from '../theme';
import type { Lang } from '../i18n/strings';
import {
  AudioButton, BottomNav, Button, FeedbackSheet, LeaderboardRow, MicButton, OptionCard, PathNode, PlanCard, ProgressBar,
  QuestCard, ShopItemCard, SpeechBubble, StatsHeader, StreakWeek, Text, TextField, Toast, UnitBanner, WordChip,
} from '../ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space[3], paddingVertical: space[5], borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Text size="xs" weight={700} color="text-muted" latin style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
      {children}
    </View>
  );
}
const Row = ({ children, wrap }: { children: ReactNode; wrap?: boolean }) =>
  <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center', flexWrap: wrap ? 'wrap' : 'nowrap' }}>{children}</View>;

function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderRadius: radius.md, borderWidth: 2, borderColor: c.border, overflow: 'hidden' }}>
      {options.map((o) => (
        <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: o === value }} onPress={() => onChange(o)}
          style={{ paddingHorizontal: space[3], minHeight: 40, justifyContent: 'center', backgroundColor: o === value ? c['accent-soft'] : c.surface }}>
          <Text size="sm" weight={600} color={o === value ? 'on-accent-soft' : 'text-muted'} latin>{o}</Text>
        </Pressable>))}
    </View>
  );
}

export default function DesignScreen() {
  const { c, t, lang, setLang, scheme, setScheme, rtl } = useTheme();
  const params = useLocalSearchParams<{ lang?: Lang; theme?: 'light' | 'dark' }>();
  const [opt, setOpt] = useState(1);
  useEffect(() => { if (params.lang) setLang(params.lang); if (params.theme) setScheme(params.theme); }, [params.lang, params.theme]);
  useEffect(() => {
    if (Platform.OS === 'web') { document.documentElement.dir = rtl ? 'rtl' : 'ltr'; document.documentElement.lang = lang; document.body.style.backgroundColor = c.bg; }
  }, [rtl, lang, c.bg]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View {...({ dir: rtl ? 'rtl' : 'ltr' } as object)} style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
        <StatsHeader streak={12} gems={845} energy={18} streakToday />
        <ScrollView contentContainerStyle={{ padding: layout.gutter, paddingBottom: space[16], maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
          <View style={{ gap: space[3], paddingBottom: space[4] }}>
            <Text size="2xl" weight={700}>{`${t('appName')} · ${t('designSystem')}`}</Text>
            <Row wrap>
              <Toggle options={['ar', 'fr', 'en']} value={lang} onChange={(v) => setLang(v as Lang)} />
              <Toggle options={['light', 'dark']} value={scheme} onChange={(v) => setScheme(v as 'light' | 'dark')} />
            </Row>
          </View>

          <Section title="Colour roles">
            <Row wrap>
              {(['bg', 'surface', 'surface-sunken', 'border', 'text', 'text-muted', 'accent', 'reward', 'success', 'danger', 'icon-streak', 'icon-gem', 'icon-energy', 'icon-xp'] as const).map((k) => (
                <View key={k} style={{ width: 76, gap: 4 }}>
                  <View style={{ height: 40, borderRadius: radius.sm, backgroundColor: c[k], borderWidth: 1, borderColor: c.border }} />
                  <Text size="xs" color="text-muted" latin>{k}</Text>
                </View>))}
            </Row>
          </Section>

          <Section title="Type scale · Readex Pro">
            <Text size="3xl" weight={700}>{t('correct')}</Text>
            <Text size="2xl" weight={700}>{t('translate')}</Text>
            <Text size="xl" weight={600}>{t('unitTitle')}</Text>
            <Text size="lg" latin>{t('hello')}</Text>
            <Text size="md">{t('bubble')}</Text>
            <Text size="sm" color="text-muted">{t('offlineToast')}</Text>
          </Section>

          <Section title="Button">
            <Button label={t('continue')} />
            <Button label={t('getPlus')} variant="reward" />
            <Row><View style={{ flex: 1 }}><Button label={t('skip')} variant="secondary" /></View><View style={{ flex: 1 }}><Button label={t('check')} disabled /></View></Row>
            <Row><View style={{ flex: 1 }}><Button label={t('start')} variant="success" size="sm" /></View><View style={{ flex: 1 }}><Button label={t('continue')} loading size="sm" /></View><View style={{ flex: 1 }}><Button label={t('report')} variant="ghost" size="sm" /></View></Row>
          </Section>

          <Section title="Option card">
            {[t('hello'), 'Thank you very much', 'See you tomorrow'].map((l, i) => (
              <OptionCard key={i} index={i + 1} label={l} latin state={opt === i ? 'selected' : 'idle'} onPress={() => setOpt(i)} />))}
            <OptionCard label="Good morning" latin state="correct" />
            <OptionCard label="Good night" latin state="wrong" />
            <OptionCard label="Goodbye" latin state="disabled" />
          </Section>

          <Section title="Lesson: prompt, audio, word bank, input, mic">
            <ProgressBar value={0.45} label="lesson progress" />
            <SpeechBubble text={t('bubble')} />
            <Row><AudioButton /><AudioButton slow size="md" /><AudioButton playing size="md" /></Row>
            <View style={{ minHeight: 56, borderBottomWidth: 2, borderBottomColor: c.border, flexDirection: 'row', gap: space[2], flexWrap: 'wrap', direction: 'ltr' }}>
              <WordChip word="Thank" state="placed" /><WordChip word="you" state="placed" />
            </View>
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', justifyContent: 'center', direction: 'ltr' }}>
              <WordChip word="Thank" state="used" /><WordChip word="you" state="used" /><WordChip word="very" /><WordChip word="much" state="hint" /><WordChip word="please" /><WordChip word="sorry" />
            </View>
            <TextField placeholder={t('typeHere')} />
            <TextField placeholder={t('typeHere')} value="شكرا" error={t('fieldError')} />
            <MicButton /><MicButton state="listening" /><MicButton state="unavailable" />
          </Section>

          <Section title="Feedback sheet">
            <FeedbackSheet kind="correct" />
            <FeedbackSheet kind="typo" answer="Thank you very much." />
            <FeedbackSheet kind="wrong" answer="Nice to meet you." />
          </Section>

          <Section title="Path">
            <UnitBanner n={1} section={1} />
            <View style={{ alignItems: 'center', gap: space[3] }}>
              <View style={{ marginStart: 0 }}><PathNode kind="lesson" state="done" /></View>
              <View style={{ marginStart: 96 }}><PathNode kind="lesson" state="in_progress" progress={0.6} /></View>
              <View style={{ marginStart: 128 }}><PathNode kind="story" state="current" /></View>
              <View style={{ marginStart: 96 }}><PathNode kind="chest" state="locked" /></View>
              <View style={{ marginStart: 0 }}><PathNode kind="unit_test" state="locked" /></View>
            </View>
            <Row wrap>
              <PathNode kind="review" state="done" unit={3} /><PathNode kind="lesson" state="legendary" unit={2} />
              <PathNode kind="roleplay" state="current" unit={5} /><PathNode kind="lesson" state="done" unit={4} />
            </Row>
            <UnitBanner n={2} section={1} />
          </Section>

          <Section title="Streak, quests, shop">
            <StreakWeek days={['done', 'done', 'frozen', 'done', 'today', 'future', 'future']} />
            <QuestCard title={t('questXp')} progress={18} target={30} />
            <QuestCard title={t('questLessons')} progress={2} target={2} claimable />
            <ShopItemCard kind="refill" title={t('refill')} price={350} />
            <ShopItemCard kind="freeze" title={t('freeze')} owned={`${t('equipped')} 1/2`} price={200} affordable={false} />
          </Section>

          <Section title="Leaderboard">
            <Text size="sm" weight={600} color="success">{t('promoZone')}</Text>
            <LeaderboardRow rank={1} name="Yasmine" xp={1240} zone="promote" />
            <LeaderboardRow rank={2} name={t('you')} xp={980} zone="promote" self />
            <LeaderboardRow rank={3} name="Hugo" xp={955} zone="promote" />
            <LeaderboardRow rank={28} name="Karim" xp={40} zone="demote" />
          </Section>

          <Section title="Paywall plans">
            <Row>
              <View style={{ flex: 1 }}><PlanCard title="Plus" price="49 MAD" period={t('perMonth')} /></View>
              <View style={{ flex: 1 }}><PlanCard title="Plus" price="399 MAD" period={t('perYear')} selected badge={t('bestValue')} /></View>
            </Row>
          </Section>

          <Section title="Toast">
            <Toast text={t('savedToast')} />
            <Toast text={t('offlineToast')} tone="offline" />
          </Section>
        </ScrollView>
        <BottomNav active="learn" badge="quests" />
      </View>
    </SafeAreaView>
  );
}
