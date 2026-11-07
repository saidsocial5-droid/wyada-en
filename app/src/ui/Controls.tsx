import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Check, Mic, MicOff, Snail, Volume2, X } from 'lucide-react-native';
import { depth, font, radius, space, useTheme, type ColorRole } from '../theme';
import { Text } from './Text';

/* ---------- OptionCard: onboarding choices and multiple choice answers ---------- */
export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled';
const optionLook: Record<OptionState, { bg: ColorRole; border: ColorRole; fg: ColorRole }> = {
  idle: { bg: 'surface', border: 'border', fg: 'text' },
  selected: { bg: 'accent-soft', border: 'accent', fg: 'on-accent-soft' },
  correct: { bg: 'success-soft', border: 'success', fg: 'on-success-soft' },
  wrong: { bg: 'danger-soft', border: 'danger', fg: 'on-danger-soft' },
  disabled: { bg: 'surface-sunken', border: 'border', fg: 'text-disabled' },
};
export function OptionCard({ label, hint, state = 'idle', onPress, latin, index }:
  { label: string; hint?: string; state?: OptionState; onPress?: () => void; latin?: boolean; index?: number }) {
  const { c } = useTheme();
  const l = optionLook[state];
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: state === 'selected', disabled: state === 'disabled' }}
      disabled={state === 'disabled'} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, padding: space[3],
        borderRadius: radius.lg, borderWidth: 2, borderBottomWidth: pressed ? 2 : 2 + depth['edge-sm'],
        borderColor: c[l.border], backgroundColor: c[l.bg], transform: [{ translateY: pressed ? depth['edge-sm'] : 0 }] })}>
      {index != null && (
        <View style={{ width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, borderColor: c[l.border], alignItems: 'center', justifyContent: 'center' }}>
          <Text size="sm" weight={600} color={l.fg} latin>{index}</Text>
        </View>)}
      <View style={{ flex: 1 }}>
        <Text weight={600} color={l.fg} latin={latin}>{label}</Text>
        {hint ? <Text size="sm" color="text-muted">{hint}</Text> : null}
      </View>
      {state === 'correct' && <Check color={c.success} size={22} />}
      {state === 'wrong' && <X color={c.danger} size={22} />}
    </Pressable>
  );
}

/* ---------- WordChip: word bank tokens (always English, LTR) ---------- */
export type ChipState = 'bank' | 'placed' | 'used' | 'hint';
export function WordChip({ word, state = 'bank', onPress }: { word: string; state?: ChipState; onPress?: () => void }) {
  const { c } = useTheme();
  if (state === 'used') // keeps its slot so the bank doesn't jump
    return <View accessibilityElementsHidden style={{ paddingHorizontal: space[3], height: 44, borderRadius: radius.md, backgroundColor: c['surface-sunken'] }}>
      <Text latin style={{ opacity: 0, lineHeight: 44 }}>{word}</Text></View>;
  const hint = state === 'hint';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={word} onPress={onPress}
      style={({ pressed }) => ({ paddingHorizontal: space[3], height: 44, justifyContent: 'center', borderRadius: radius.md,
        backgroundColor: hint ? c['accent-soft'] : c.surface, borderWidth: 2, borderColor: hint ? c.accent : c.border,
        borderBottomWidth: pressed ? 2 : 2 + depth['edge-sm'], transform: [{ translateY: pressed ? depth['edge-sm'] : 0 }] })}>
      <Text latin weight={500} color={hint ? 'on-accent-soft' : 'text'}>{word}</Text>
    </Pressable>
  );
}

/* ---------- TextField: typed answers ---------- */
export function TextField({ placeholder, error, value: initial = '' }: { placeholder: string; error?: string; value?: string }) {
  const { c } = useTheme();
  const [value, setValue] = useState(initial);
  const [focus, setFocus] = useState(false);
  const border = error ? c.danger : focus ? c['focus-ring'] : c['border-input'];
  return (
    <View style={{ gap: space[1] }}>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={c['text-muted']}
        accessibilityLabel={placeholder} accessibilityHint={error} autoCapitalize="sentences" autoCorrect={false}
        multiline onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={[font('lg', 400), { minHeight: 120, padding: space[4], borderRadius: radius.lg, borderWidth: focus || error ? 2 : 1.5,
          borderColor: border, backgroundColor: c['surface-sunken'], color: c.text, textAlignVertical: 'top', writingDirection: 'ltr', textAlign: 'left',
          outlineStyle: 'none' } as never]} />
      {error ? <Text size="sm" color="danger" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

/* ---------- AudioButton: normal and slow ---------- */
export function AudioButton({ slow, size = 'lg', playing }: { slow?: boolean; size?: 'md' | 'lg'; playing?: boolean }) {
  const { c, t } = useTheme();
  const d = size === 'lg' ? 72 : 52;
  const Icon = slow ? Snail : Volume2;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t(slow ? 'listenSlow' : 'listen')}
      style={({ pressed }) => ({ width: d, height: d, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
        backgroundColor: playing ? c['accent-edge'] : c.accent, borderBottomWidth: pressed ? 0 : depth['edge-md'], borderBottomColor: c['accent-edge'],
        transform: [{ translateY: pressed ? depth['edge-md'] : 0 }] })}>
      <Icon color={c['on-accent']} size={d * 0.45} />
    </Pressable>
  );
}

/* ---------- MicButton: speak exercises ---------- */
export type MicState = 'idle' | 'listening' | 'processing' | 'unavailable';
export function MicButton({ state = 'idle' }: { state?: MicState }) {
  const { c, t } = useTheme();
  const listening = state === 'listening';
  const off = state === 'unavailable';
  const label = off ? t('cantSpeak') : listening ? t('listening') : t('speak');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off, busy: state === 'processing' }}
      disabled={off}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[3], minHeight: 64, borderRadius: radius.lg,
        borderWidth: 2, borderColor: listening ? c.accent : c.border, borderBottomWidth: 2 + depth['edge-sm'],
        backgroundColor: listening ? c['accent-soft'] : off ? c['surface-sunken'] : c.surface }}>
      {off ? <MicOff color={c['text-disabled']} size={26} /> : <Mic color={c.accent} size={26} />}
      {listening && <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
        {[10, 22, 14, 26, 12].map((h, i) => <View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: c.accent }} />)}</View>}
      <Text weight={600} color={off ? 'text-disabled' : listening ? 'on-accent-soft' : 'accent'}>{label}</Text>
    </Pressable>
  );
}

/* ---------- ProgressBar: lesson, quest, XP ---------- */
export function ProgressBar({ value, tone = 'success', height = 16, label }: { value: number; tone?: 'success' | 'reward' | 'accent'; height?: number; label?: string }) {
  const { c } = useTheme(); // row flips by itself under an RTL root
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: c['surface-sunken'], overflow: 'hidden', flexDirection: 'row' }}>
      <View style={{ width: `${pct * 100}%`, borderRadius: radius.pill, backgroundColor: c[tone] }}>
        <View style={{ height: height / 4, marginTop: height / 5, marginHorizontal: height / 2, borderRadius: radius.pill, backgroundColor: '#FFFFFF', opacity: 0.3 }} />
      </View>
    </View>
  );
}
