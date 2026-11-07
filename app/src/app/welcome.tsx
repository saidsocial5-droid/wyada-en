import { View } from 'react-native';
import { router } from 'expo-router';
import { layout, radius, space, useTheme } from '../theme';
import type { Lang } from '../i18n/strings';
import { Button, Screen, Text } from '../ui';
import { Pressable } from 'react-native';

/** S01 Welcome. */
export default function Welcome() {
  const { c, t, lang, setLang } = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, padding: layout.gutter, maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] }}>
          {(['ar', 'fr', 'en'] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} accessibilityRole="button" accessibilityState={{ selected: l === lang }}
              style={{ minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
                borderWidth: 2, borderColor: l === lang ? c.accent : c.border, backgroundColor: l === lang ? c['accent-soft'] : c.surface }}>
              <Text size="sm" weight={600} latin color={l === lang ? 'on-accent-soft' : 'text-muted'}>{l.toUpperCase()}</Text>
            </Pressable>))}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6] }}>
          <View accessibilityElementsHidden style={{ width: 160, height: 160, borderRadius: radius.xl, backgroundColor: c['accent-soft'],
            borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" color="text-muted" center>{'character\nart'}</Text>
          </View>
          <Text size="3xl" weight={700} color="accent" latin center>WYADA EN</Text>
          <Text size="lg" color="text-muted" center>{t('tagline')}</Text>
        </View>
        <Button testID="get-started" label={t('getStarted')} size="lg" onPress={() => router.push('/onboarding')} />
      </View>
    </Screen>
  );
}
