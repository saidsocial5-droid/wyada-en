import { Pressable, View } from 'react-native';
import { BookOpen, Check, Crown, Dumbbell, Flame, Gem, Gift, Infinity as InfinityIcon, Lock, MessageCircle, Snowflake, Star, Trophy, Zap } from 'lucide-react-native';
import { depth, radius, space, unitColors, useTheme } from '../theme';
import { Text } from './Text';
import { Button } from './Button';
import { ProgressBar } from './Controls';

/* ---------- StatsHeader: streak, gems, energy ---------- */
export function StatsHeader({ streak, gems, energy, infinite, streakToday }: { streak: number; gems: number; energy: number; infinite?: boolean; streakToday?: boolean }) {
  const { c } = useTheme();
  const item = (icon: React.ReactNode, value: React.ReactNode, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 48, paddingHorizontal: space[2] }}>
      {icon}{value}
    </Pressable>);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56, paddingHorizontal: space[2],
      borderBottomWidth: 2, borderBottomColor: c.border, backgroundColor: c.surface }}>
      <View style={{ width: 32, height: 24, borderRadius: 6, backgroundColor: c['accent-soft'], alignItems: 'center', justifyContent: 'center' }}>
        <Text size="xs" weight={700} color="on-accent-soft" latin>EN</Text></View>
      {item(<Flame color={streakToday ? c['icon-streak'] : c['text-disabled']} fill={streakToday ? c['icon-streak'] : 'transparent'} size={22} />,
        <Text weight={700} color={streakToday ? 'icon-streak' : 'text-muted'} latin>{streak}</Text>, `streak ${streak}`)}
      {item(<Gem color={c['icon-gem']} size={22} />, <Text weight={700} color="icon-gem" latin>{gems}</Text>, `gems ${gems}`)}
      {item(<Zap color={c['icon-energy']} fill={c['icon-energy']} size={22} />,
        infinite ? <InfinityIcon color={c['icon-energy']} size={22} /> : <Text weight={700} color="icon-energy" latin>{energy}</Text>, infinite ? 'energy unlimited' : `energy ${energy}`)}
    </View>
  );
}

/* ---------- UnitBanner ---------- */
export function UnitBanner({ n, section, title }: { n: number; section: number; title?: string }) {
  const { t } = useTheme();
  const [fill, on] = unitColors[`unit-${((n - 1) % 6) + 1}` as keyof typeof unitColors];
  return (
    <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg,
      backgroundColor: fill, borderBottomWidth: depth['edge-md'], borderBottomColor: '#00000033' }}>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text size="sm" weight={600} color={on} style={{ opacity: 0.85 }}>{`${t('unit')} ${section} · ${n}`}</Text>
        <Text size="lg" weight={700} color={on}>{title ?? t('unitTitle')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('guidebook')}
        style={{ minWidth: 48, minHeight: 48, borderRadius: radius.md, borderWidth: 2, borderColor: '#FFFFFF66', alignItems: 'center', justifyContent: 'center' }}>
        <BookOpen color={on} size={22} /></Pressable>
    </View>
  );
}

/* ---------- PathNode ---------- */
export type NodeKind = 'lesson' | 'story' | 'review' | 'chest' | 'unit_test' | 'roleplay';
export type NodeState = 'locked' | 'current' | 'in_progress' | 'done' | 'legendary';
const kindIcon = { lesson: Star, story: BookOpen, review: Dumbbell, chest: Gift, unit_test: Trophy, roleplay: MessageCircle };
export function PathNode({ kind, state, progress = 0, unit = 1, label, onPress, testID }: { kind: NodeKind; state: NodeState; progress?: number; unit?: number; label?: string; onPress?: () => void; testID?: string }) {
  const { c } = useTheme();
  const [fill, on] = unitColors[`unit-${((unit - 1) % 6) + 1}` as keyof typeof unitColors];
  const Icon = state === 'done' && kind === 'lesson' ? Check : state === 'legendary' ? Crown : kind === 'roleplay' ? MessageCircle : kindIcon[kind];
  const bg = state === 'locked' ? c.locked : state === 'legendary' ? c.reward : fill;
  const fg = state === 'locked' ? c['on-locked'] : state === 'legendary' ? c['on-reward'] : on;
  const d = 72;
  const { t } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space[1] }}>
      {state === 'current' && (
        <View style={{ paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.md, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface }}>
          <Text size="sm" weight={700} color="accent" style={{ textTransform: 'uppercase' }}>{t('start')}</Text>
        </View>)}
      <View style={{ width: d + 16, height: d + 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
        borderWidth: state === 'in_progress' || state === 'current' ? 6 : 0, borderColor: state === 'in_progress' ? c.border : state === 'current' ? c['accent-soft'] : 'transparent',
        borderTopColor: state === 'in_progress' && progress > 0 ? fill : undefined, borderRightColor: state === 'in_progress' && progress > 0.25 ? fill : undefined,
        borderBottomColor: state === 'in_progress' && progress > 0.5 ? fill : undefined, borderLeftColor: state === 'in_progress' && progress > 0.75 ? fill : undefined }}>
        <Pressable testID={testID} onPress={state === 'locked' ? undefined : onPress} accessibilityRole="button" accessibilityLabel={`${label ?? kind}, ${state}`} accessibilityState={{ disabled: state === 'locked' }}
          style={({ pressed }) => ({ width: d, height: d - 6, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: pressed ? 0 : 6, borderBottomColor: '#00000038', transform: [{ translateY: pressed ? 6 : 0 }] })}>
          {state === 'locked' ? <Lock color={fg} size={28} /> : <Icon color={fg} size={30} fill={kind === 'lesson' && state !== 'done' ? fg : 'transparent'} />}
        </Pressable>
      </View>
      {label ? <Text size="xs" color="text-muted">{label}</Text> : null}
    </View>
  );
}

/* ---------- QuestCard ---------- */
export function QuestCard({ title, progress, target, claimable }: { title: string; progress: number; target: number; claimable?: boolean }) {
  const { c, t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface }}>
      <Zap color={c['icon-energy']} fill={c['icon-energy']} size={28} />
      <View style={{ flex: 1, gap: space[2] }}>
        <Text weight={600}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <View style={{ flex: 1 }}><ProgressBar value={progress / target} tone="reward" height={14} label={title} /></View>
          <Text size="sm" color="text-muted" latin>{`${progress}/${target}`}</Text>
        </View>
      </View>
      {claimable ? <Button label={t('claim')} variant="reward" size="sm" full={false} /> : <Gift color={c['text-muted']} size={28} />}
    </View>
  );
}

/* ---------- LeaderboardRow ---------- */
export function LeaderboardRow({ rank, name, xp, self, zone }: { rank: number; name: string; xp: number; self?: boolean; zone?: 'promote' | 'demote' }) {
  const { c } = useTheme();
  const rankColor = zone === 'promote' ? 'success' : zone === 'demote' ? 'danger' : 'text-muted';
  return (
    <View accessibilityLabel={`${rank}. ${name}, ${xp} XP`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64, paddingHorizontal: space[4],
      borderRadius: radius.md, backgroundColor: self ? c['accent-soft'] : 'transparent' }}>
      <Text weight={700} color={rankColor} latin style={{ width: 28 }} center>{rank}</Text>
      <Avatar name={name} />
      <Text weight={self ? 700 : 500} color={self ? 'on-accent-soft' : 'text'} style={{ flex: 1 }}>{name}</Text>
      <Text weight={600} color="text-muted" latin>{`${xp} XP`}</Text>
    </View>
  );
}

/* ---------- Avatar: initials on a unit colour (real avatars come from the builder) ---------- */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const keys = Object.keys(unitColors) as (keyof typeof unitColors)[];
  const [fill, on] = unitColors[keys[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % keys.length]];
  return (
    <View accessibilityElementsHidden style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
      <Text weight={700} color={on} size={size > 48 ? 'xl' : 'md'}>{[...name][0]}</Text>
    </View>
  );
}

/* ---------- ShopItemCard ---------- */
export function ShopItemCard({ title, price, owned, affordable = true, kind }: { title: string; price: number; owned?: string; affordable?: boolean; kind: 'refill' | 'freeze' }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface }}>
      <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: c['surface-sunken'], alignItems: 'center', justifyContent: 'center' }}>
        {kind === 'refill' ? <Zap color={c['icon-energy']} fill={c['icon-energy']} size={30} /> : <Snowflake color={c['icon-gem']} size={30} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text weight={600}>{title}</Text>
        {owned ? <Text size="sm" color="text-muted">{owned}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${price} gems`} disabled={!affordable}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: 44, paddingHorizontal: space[3], borderRadius: radius.md,
          borderWidth: 2, borderColor: c.border, borderBottomWidth: 2 + depth['edge-sm'], opacity: affordable ? 1 : 0.5 }}>
        <Gem color={c['icon-gem']} size={18} /><Text weight={700} color={affordable ? 'icon-gem' : 'text-disabled'} latin>{price}</Text>
      </Pressable>
    </View>
  );
}

/* ---------- PlanCard ---------- */
export function PlanCard({ title, price, period, selected, badge }: { title: string; price: string; period: string; selected?: boolean; badge?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: !!selected }}
      style={{ padding: space[4], paddingTop: badge ? space[5] : space[4], borderRadius: radius.lg, borderWidth: 2, borderBottomWidth: 2 + depth['edge-sm'],
        borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c['accent-soft'] : c.surface, gap: space[1] }}>
      {badge ? <View style={{ position: 'absolute', top: -12, alignSelf: 'center', paddingHorizontal: space[3], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.reward }}>
        <Text size="xs" weight={700} color="on-reward">{badge}</Text></View> : null}
      <Text weight={700} color={selected ? 'on-accent-soft' : 'text'}>{title}</Text>
      <Text size="xl" weight={700} color={selected ? 'on-accent-soft' : 'text'} latin>{price}<Text size="sm" color="text-muted">{` ${period}`}</Text></Text>
    </Pressable>
  );
}

/* ---------- StreakCalendar: one week row ---------- */
export type DayStatus = 'done' | 'frozen' | 'missed' | 'today' | 'future';
export function StreakWeek({ days }: { days: DayStatus[] }) {
  const { c, t } = useTheme();
  const labels = t('days').split(' ');
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d, i) => (
        <View key={i} style={{ alignItems: 'center', gap: space[1] }} accessibilityLabel={`${labels[i]} ${d}`}>
          <Text size="xs" color="text-muted">{labels[i]}</Text>
          <View style={{ width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
            backgroundColor: d === 'done' ? c['icon-streak'] : d === 'frozen' ? c['icon-gem'] : c['surface-sunken'],
            borderWidth: d === 'today' ? 2 : 0, borderColor: c['icon-streak'] }}>
            {d === 'done' ? <Flame color="#FFFFFF" fill="#FFFFFF" size={18} /> : d === 'frozen' ? <Snowflake color="#FFFFFF" size={18} /> :
              d === 'missed' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c['text-disabled'] }} /> : null}
          </View>
        </View>))}
    </View>
  );
}
