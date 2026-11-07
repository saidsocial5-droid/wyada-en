import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useBackend, type Home } from '../backend';
import { layout, space, useTheme } from '../theme';
import { BottomNav, Button, PathNode, Screen, StatsHeader, Text, Toast, UnitBanner } from '../ui';

const ZIGZAG = [0, 96, 128, 96, 0, -96, -128, -96];

/** S08 Home: the learning path. */
export default function Learn() {
  const backend = useBackend();
  const { c, t } = useTheme();
  const [home, setHome] = useState<Home | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    backend.getHome().then(setHome).catch(() => setFailed(true));
  }, [backend]);
  useFocusEffect(load); // refresh after a lesson

  const allDone = home?.units.every((u) => u.nodes.every((n) => n.state === 'done'));
  return (
    <Screen>
      <StatsHeader streak={home?.streak ?? 0} gems={home?.gems ?? 0} energy={home?.energy ?? 0} streakToday={home?.streakToday} />
      {!home ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], padding: space[6] }}>
          {failed ? <><Text center>{t('loadError')}</Text><Button label={t('retry')} onPress={load} full={false} /></>
            : <ActivityIndicator color={c.accent} size="large" />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: layout.gutter, gap: space[6], paddingBottom: space[16], maxWidth: layout.max_content, width: '100%', alignSelf: 'center' }}>
          {backend.mode === 'demo' && <Toast tone="offline" text={t('demoMode')} />}
          {home.units.map((u) => (
            <View key={u.id} style={{ gap: space[6] }}>
              <UnitBanner n={u.position} section={u.section} title={u.title} />
              <View style={{ alignItems: 'center', gap: space[4] }}>
                {u.nodes.map((n, i) => (
                  <View key={n.id} style={{ marginStart: ZIGZAG[i % ZIGZAG.length] }}>
                    <PathNode testID={`node-${i + 1}`} kind={n.kind} unit={u.position}
                      state={n.state === 'current' ? 'current' : n.state === 'done' ? 'done' : 'locked'}
                      label={`${i + 1}`} onPress={() => router.push({ pathname: '/lesson/[nodeId]', params: { nodeId: n.id } })} />
                  </View>))}
              </View>
            </View>))}
          {allDone && <Text center color="text-muted">{t('courseDone')}</Text>}
        </ScrollView>
      )}
      <BottomNav active="learn" />
    </Screen>
  );
}
