import { useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** Screen root: background, safe area, and reading direction (RTL for Arabic). */
export function Screen({ children }: { children: ReactNode }) {
  const { c, rtl, lang } = useTheme();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.style.backgroundColor = c.bg;
  }, [rtl, lang, c.bg]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View {...({ dir: rtl ? 'rtl' : 'ltr' } as object)} style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>{children}</View>
    </SafeAreaView>
  );
}
