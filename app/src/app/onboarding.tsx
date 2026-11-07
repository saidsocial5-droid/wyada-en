import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useBackend } from '../backend';
import { layout, space, useTheme } from '../theme';
import { Button, OptionCard, Screen, Text, Toast } from '../ui';

const COURSES = [
  { slug: 'en-from-ar', label: 'courseFromAr', ready: true },
  { slug: 'en-from-fr', label: 'courseFromFr', ready: false },
] as const;

/** S02 Pick the course (by the language the learner speaks). */
export default function Onboarding() {
  const { c, t, lang, rtl } = useTheme();
  const backend = useBackend();
  const [slug, setSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const Back = rtl ? ArrowRight : ArrowLeft;

  const go = async () => {
    if (!slug) return;
    setBusy(true); setError(false);
    try {
      await backend.startCourse({ slug, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', dailyGoalXp: 20, uiLanguage: lang });
      if (router.canDismiss()) router.dismissAll(); // no way back into onboarding from the path
      router.replace('/learn');
    } catch { setError(true); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={{ flex: 1, padding: layout.gutter, gap: space[6], maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => router.back()}
          style={{ width: 48, height: 48, justifyContent: 'center' }}><Back color={c['text-muted']} size={26} /></Pressable>
        <Text size="2xl" weight={700}>{t('whatDoYouSpeak')}</Text>
        <View style={{ gap: space[3] }}>
          {COURSES.map((co) => (
            <OptionCard key={co.slug} testID={`course-${co.slug}`} label={t(co.label)} hint={co.ready ? undefined : t('soon')}
              state={!co.ready ? 'disabled' : slug === co.slug ? 'selected' : 'idle'} onPress={() => setSlug(co.slug)} />))}
        </View>
        <View style={{ flex: 1 }} />
        {error && <Toast tone="offline" text={t('loadError')} />}
        <Button testID="continue" label={t('continue')} size="lg" disabled={!slug} loading={busy} onPress={go} />
      </View>
    </Screen>
  );
}
