import { Text as RNText, type TextProps } from 'react-native';
import { font, useTheme, type ColorRole, type TextSize } from '../theme';

type Props = TextProps & { size?: TextSize; weight?: 400 | 500 | 600 | 700; color?: ColorRole | string; center?: boolean; latin?: boolean };

/** Every text in the app goes through here: token sizes, Arabic line height, RTL alignment. */
export function Text({ size = 'md', weight = 400, color = 'text', center, latin, style, ...rest }: Props) {
  const { c, rtl } = useTheme();
  const col = (c as Record<string, string>)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[font(size, weight, rtl && !latin), { color: col, textAlign: center ? 'center' : rtl && !latin ? 'right' : 'left',
        writingDirection: latin ? 'ltr' : rtl ? 'rtl' : 'ltr' }, style]}
    />
  );
}
