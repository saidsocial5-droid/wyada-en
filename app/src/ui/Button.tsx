import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { depth, radius, space, useTheme, type ColorRole } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'reward' | 'success' | 'danger' | 'ghost';
const sizes = { sm: { h: 40, px: space[4], text: 'sm' as const, edge: depth['edge-sm'] },
  md: { h: 48, px: space[5], text: 'md' as const, edge: depth['edge-md'] },
  lg: { h: 56, px: space[6], text: 'lg' as const, edge: depth['edge-lg'] } };

const look: Record<ButtonVariant, { bg: ColorRole; edge: ColorRole; fg: ColorRole; border?: ColorRole }> = {
  primary: { bg: 'accent', edge: 'accent-edge', fg: 'on-accent' },
  secondary: { bg: 'surface', edge: 'border', fg: 'accent', border: 'border' },
  reward: { bg: 'reward', edge: 'reward-edge', fg: 'on-reward' },
  success: { bg: 'success', edge: 'success-edge', fg: 'on-success' },
  danger: { bg: 'danger', edge: 'danger-edge', fg: 'on-danger' },
  ghost: { bg: 'surface', edge: 'surface', fg: 'accent' },
};

type Props = { label: string; onPress?: () => void; variant?: ButtonVariant; size?: keyof typeof sizes;
  disabled?: boolean; loading?: boolean; icon?: ReactNode; full?: boolean };

/** Chunky pressable: a solid bottom edge that sinks on press. Min height 40, md/lg meet the 48px target. */
export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, loading, icon, full = true }: Props) {
  const { c, t } = useTheme();
  const s = sizes[size];
  const v = look[variant];
  const off = disabled || loading;
  const bg = disabled ? c['surface-sunken'] : c[v.bg];
  const edge = disabled || variant === 'ghost' ? 'transparent' : c[v.edge];
  const fg = disabled ? c['text-disabled'] : c[v.fg];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? `${label}, ${t('loading')}` : label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => ({
        alignSelf: full ? 'stretch' : 'flex-start',
        minHeight: s.h, paddingHorizontal: s.px, borderRadius: radius.lg, backgroundColor: bg,
        borderWidth: v.border ? 2 : 0, borderColor: v.border ? c[v.border] : 'transparent',
        borderBottomWidth: pressed ? (v.border ? 2 : 0) : s.edge + (v.border ? 2 : 0), borderBottomColor: v.border ? c[v.border] : edge,
        transform: [{ translateY: pressed ? s.edge : 0 }],
        marginBottom: pressed ? 0 : 0,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space[2],
        outlineStyle: focused ? 'solid' : undefined, outlineWidth: focused ? 2 : 0, outlineColor: c['focus-ring'], outlineOffset: 2,
      }) as never}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <View>{icon}</View> : null}
      {!loading && <Text size={s.text} weight={700} color={fg} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>}
    </Pressable>
  );
}
