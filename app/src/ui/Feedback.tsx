import { Pressable, View } from 'react-native';
import { CheckCircle2, Dumbbell, Flag, Home, Shield, Sparkles, Target, User, WifiOff, XCircle } from 'lucide-react-native';
import { radius, space, useTheme, type ColorRole } from '../theme';
import { Text } from './Text';
import { Button } from './Button';

/* ---------- FeedbackSheet: after Check ---------- */
export type FeedbackKind = 'correct' | 'wrong' | 'typo';
export function FeedbackSheet({ kind, answer, onContinue, showExplain = true }: { kind: FeedbackKind; answer?: string; onContinue?: () => void; showExplain?: boolean }) {
  const { c, t } = useTheme();
  const good = kind !== 'wrong';
  const bg: ColorRole = good ? 'success-soft' : 'danger-soft';
  const fg: ColorRole = good ? 'on-success-soft' : 'on-danger-soft';
  const Icon = good ? CheckCircle2 : XCircle;
  return (
    <View accessibilityLiveRegion="assertive" accessibilityRole="alert"
      style={{ padding: space[4], paddingBottom: space[6], gap: space[3], backgroundColor: c[bg], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Icon color={good ? c.success : c.danger} size={28} />
        <Text size="xl" weight={700} color={fg} style={{ flex: 1 }}>{kind === 'correct' ? t('correct') : kind === 'typo' ? t('typo') : t('wrong')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('report')} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Flag color={c[fg]} size={20} /></Pressable>
      </View>
      {answer ? <Text size="lg" color={fg} latin>{answer}</Text> : null}
      {kind !== 'correct' && showExplain && (
        <Pressable accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 }}>
          <Sparkles color={c[fg]} size={18} /><Text weight={600} color={fg} style={{ textDecorationLine: 'underline' }}>{t('explain')}</Text>
        </Pressable>)}
      <Button testID="feedback-continue" label={t('continue')} variant={good ? 'success' : 'danger'} onPress={onContinue} />
    </View>
  );
}

/* ---------- SpeechBubble: the guide character talks (original cast only) ---------- */
export function SpeechBubble({ text, latin }: { text: string; latin?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
      <View accessibilityElementsHidden style={{ width: 72, height: 88, borderRadius: radius.xl, backgroundColor: c['accent-soft'], borderWidth: 2, borderColor: c.border,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text size="xs" color="text-muted" center>{'character\nart'}</Text>
      </View>
      <View style={{ flex: 1, padding: space[4], borderRadius: radius.lg, borderWidth: 2, borderColor: c.border, backgroundColor: c.surface }}>
        <Text size="lg" latin={latin}>{text}</Text>
      </View>
    </View>
  );
}

/* ---------- Toast ---------- */
export function Toast({ text, tone = 'info' }: { text: string; tone?: 'info' | 'offline' }) {
  const { c } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3], paddingHorizontal: space[4],
      borderRadius: radius.md, backgroundColor: tone === 'offline' ? c['warning-soft'] : c.text }}>
      {tone === 'offline' ? <WifiOff color={c['on-warning-soft']} size={18} /> : <CheckCircle2 color={c.bg} size={18} />}
      <Text size="sm" weight={500} color={tone === 'offline' ? 'on-warning-soft' : c.bg} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

/* ---------- BottomNav ---------- */
const tabs = [
  { key: 'learn', Icon: Home }, { key: 'practice', Icon: Dumbbell }, { key: 'leagues', Icon: Shield },
  { key: 'quests', Icon: Target }, { key: 'profile', Icon: User },
] as const;
export function BottomNav({ active = 'learn', badge }: { active?: (typeof tabs)[number]['key']; badge?: (typeof tabs)[number]['key'] }) {
  const { c, t } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', height: 64, borderTopWidth: 2, borderTopColor: c.border, backgroundColor: c.surface }}>
      {tabs.map(({ key, Icon }) => {
        const on = key === active;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityLabel={t(key)} accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ padding: space[2], borderRadius: radius.md, borderWidth: 2, borderColor: on ? c.accent : 'transparent', backgroundColor: on ? c['accent-soft'] : 'transparent' }}>
              <Icon color={on ? c.accent : c['text-muted']} size={24} />
              {badge === key && <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: c.danger }} />}
            </View>
          </Pressable>);
      })}
    </View>
  );
}

/* ---------- ConfirmDialog ---------- */
export function ConfirmDialog({ visible, title, body, confirm, cancel, onConfirm, onCancel, destructive }:
  { visible: boolean; title: string; body?: string; confirm: string; cancel: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean }) {
  const { c } = useTheme();
  if (!visible) return null;
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: c.surface, padding: space[6], gap: space[3], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
        <Text size="xl" weight={700} center accessibilityRole="header">{title}</Text>
        {body ? <Text color="text-muted" center>{body}</Text> : null}
        <Button testID="dialog-cancel" label={cancel} onPress={onCancel} />
        <Button testID="dialog-confirm" label={confirm} variant={destructive ? 'ghost' : 'secondary'} onPress={onConfirm} />
      </View>
    </View>
  );
}
