import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getLocales } from 'expo-localization';
import { palettes, type, type Palette } from './tokens';
import { strings, type Lang } from '../i18n/strings';

export * from './tokens';

type Scheme = 'light' | 'dark';
type Ctx = {
  c: Palette; scheme: Scheme; setScheme: (s: Scheme) => void;
  lang: Lang; setLang: (l: Lang) => void; rtl: boolean; t: (k: keyof typeof strings.en) => string;
};
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [scheme, setScheme] = useState<Scheme>(system);
  const [lang, setLang] = useState<Lang>(() => {
    const code = getLocales()[0]?.languageCode;
    return code === 'fr' || code === 'en' ? code : 'ar'; // Arabic is the default audience
  });
  const value = useMemo<Ctx>(() => ({
    c: palettes[scheme] as Palette, scheme, setScheme, lang, setLang, rtl: lang === 'ar',
    t: (k) => strings[lang][k] ?? strings.en[k],
  }), [scheme, lang]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme outside ThemeProvider');
  return v;
}

const weightFont = { 400: 'ReadexPro_400Regular', 500: 'ReadexPro_500Medium', 600: 'ReadexPro_600SemiBold', 700: 'ReadexPro_700Bold' } as const;
export type TextSize = keyof typeof type.scale;
/** Font style for a scale step; Arabic gets a taller line height. */
export function font(size: TextSize, weight: 400 | 500 | 600 | 700 = 400, arabic = false) {
  const s = type.scale[size];
  return { fontFamily: weightFont[weight], fontSize: s.size, lineHeight: Math.round(s.line * (arabic ? type.arabic_line_multiplier : 1)) };
}
