import { Stack } from 'expo-router';
import { useFonts, ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold } from '@expo-google-fonts/readex-pro';
import { ThemeProvider } from '../theme';
import { BackendProvider } from '../backend';

export default function RootLayout() {
  const [loaded] = useFonts({ ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <BackendProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </BackendProvider>
    </ThemeProvider>
  );
}
