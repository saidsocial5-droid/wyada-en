import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useBackend } from '../backend';
import { useTheme } from '../theme';
import { Button, Screen, Text } from '../ui';

/** Entry: open a (guest) session, then go to the path or to onboarding. */
export default function Index() {
  const backend = useBackend();
  const { c, t } = useTheme();
  const [to, setTo] = useState<'/learn' | '/welcome' | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    backend.ensureSession().then(() => backend.getHome()).then((h) => setTo(h.course ? '/learn' : '/welcome')).catch(() => setFailed(true));
  };
  useEffect(load, [backend]);
  if (to) return <Redirect href={to} />;
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        {failed ? <><Text center>{t('loadError')}</Text><Button label={t('retry')} onPress={load} full={false} /></>
          : <ActivityIndicator color={c.accent} size="large" />}
      </View>
    </Screen>
  );
}
