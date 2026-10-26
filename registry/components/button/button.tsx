import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { createVariants } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'

export interface ButtonProps {
  title?: string
  icon?: ReactNode
  variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  /** Fill the row. */
  block?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
}

const variants = createVariants({
  variants: {
    size: {
      sm: { height: 32, paddingHorizontal: 12, gap: 6, borderRadius: 10 },
      md: { height: 40, paddingHorizontal: 14, gap: 8, borderRadius: 12 },
      lg: { height: 48, paddingHorizontal: 18, gap: 8, borderRadius: 14 },
    },
  },
  defaults: { size: 'md' },
})

/** Minimal button. `solid` is monochrome; `accent` is the only one that glows, for the single primary AI action. */
export function Button({ title, icon, variant = 'solid', size = 'md', loading, disabled, block, onPress, style, testID, accessibilityLabel }: ButtonProps) {
  const t = useTheme()
  const palette = {
    solid: { bg: t.colors.text, fg: t.colors.bg, border: 'transparent' },
    soft: { bg: t.colors.elevated, fg: t.colors.text, border: t.colors.hairline },
    outline: { bg: 'transparent', fg: t.colors.text, border: t.colors.hairlineStrong },
    ghost: { bg: 'transparent', fg: t.colors.textSecondary, border: 'transparent' },
    accent: { bg: t.colors.accent.solid, fg: t.colors.onAccent, border: 'transparent' },
    danger: { bg: t.colors.dangerSoft, fg: t.colors.danger, border: 'transparent' },
  }[variant]
  const iconOnly = !title
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: hairlineWidth, borderColor: palette.border, backgroundColor: palette.bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, minWidth: 44 },
        ...variants({ size }),
        iconOnly && { paddingHorizontal: 0, width: size === 'sm' ? 32 : size === 'md' ? 40 : 48 },
        block && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <View>{icon}</View> : null}
      {title ? (
        <Text numberOfLines={1} style={[typeStyle(t, size === 'sm' ? 'sm' : 'md', { weight: 'medium' }), { color: palette.fg }]}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  )
}

export default Button
