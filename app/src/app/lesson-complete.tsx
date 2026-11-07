import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Flame, Target, Zap } from 'lucide-react-native';
import type { LessonResult } from '../backend';
import { layout, radius, space, useTheme, type ColorRole } from '../theme';
import { Button, ProgressBar, Screen, Text } from '../ui';

/** S13 Lesson complete. */
export default function LessonComplete() {
  const { r } = useLocalSearchParams<{ r: string }>();
  const { c, t } = useTheme();
  const res = JSON.parse(r ?? '{}') as LessonResult;
  const goal = 20; // M1: default daily goal; the profile value arrives with settings (M2)

  const tile = (icon: React.ReactNode, label: string, value: string, tone: ColorRole, testID: string) => (
    <View style={{ flex: 1, borderRadius: radius.lg, borderWidth: 2, borderColor: c[tone], overflow: 'hidden' }}>
      <View style={{ paddingTop: space[2] }}><Text size="xs" weight={700} color="text-muted" center>{label}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], paddingVertical: space[3], backgroundColor: c.surface }}>
        {icon}<Text testID={testID} size="xl" weight={700} color={tone} latin>{value}</Text>
      </View>
    </View>);

  return (
    <Screen>
      <View style={{ flex: 1, padding: layout.gutter, gap: space[6], maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
          <View accessibilityElementsHidden style={{ width: 140, height: 140, borderRadius: radius.xl, backgroundColor: c['accent-soft'], borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" color="text-muted" center>{'character\nart'}</Text>
          </View>
          <Text size="3xl" weight={700} color="reward-edge" center accessibilityRole="header">{t('lessonComplete')}</Text>
          {res.streakExtended && <Text size="lg" color="text-muted" center>{res.streak > 1 ? t('streakUp') : t('streakStarted')}</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          {tile(<Zap color={c['icon-energy']} fill={c['icon-energy']} size={20} />, t('xpEarned'), `+${res.xp}`, 'icon-energy', 'result-xp')}
          {tile(<Target color={c.success} size={20} />, t('accuracy'), `${res.accuracy}%`, 'success', 'result-accuracy')}
          {tile(<Flame color={c['icon-streak']} fill={c['icon-streak']} size={20} />, t('streakLabel'), `${res.streak}`, 'icon-streak', 'result-streak')}
        </View>
        <View style={{ gap: space[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text weight={600}>{t('dailyGoal')}</Text><Text color="text-muted" latin>{`${Math.min(res.todayXp, goal)}/${goal} XP`}</Text>
          </View>
          <ProgressBar value={res.todayXp / goal} tone="reward" label={t('dailyGoal')} />
        </View>
        <Button testID="done" label={t('continue')} size="lg" onPress={() => (router.canGoBack() ? router.back() : router.replace('/learn'))} />
      </View>
    </Screen>
  );
}
