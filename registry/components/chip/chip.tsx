import type { ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { X } from 'lucide-react-native'
import { createVariants } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'

export interface ChipProps {
  label: string
  /** Secondary mono text (e.g. a count or a key). */
  meta?: string
  icon?: ReactNode
  variant?: 'soft' | 'outline' | 'solid' | 'ghost'
  size?: 'sm' | 'md'
  selected?: boolean
  /** Faded "suggested" look (inline ghost tags). */
  ghost?: boolean
  disabled?: boolean
  onPress?: () => void
  onRemove?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
}

const variants = createVariants({
  variants: {
    size: { sm: { height: 28, paddingHorizontal: 10, gap: 6 }, md: { height: 34, paddingHorizontal: 12, gap: 8 } },
    variant: { soft: {}, outline: { backgroundColor: 'transparent' }, solid: {}, ghost: { backgroundColor: 'transparent', borderColor: 'transparent' } },
  },
  defaults: { size: 'md', variant: 'soft' },
})

/** Compact selectable pill used for tags, filters, suggestions and smart replies. */
export function Chip({ label, meta, icon, variant = 'soft', size = 'md', selected, ghost, disabled, onPress, onRemove, style, testID, accessibilityLabel }: ChipProps) {
  const t = useTheme()
  const on = !!selected
  const bg = variant === 'solid' || on ? t.colors.text : variant === 'soft' ? t.colors.elevated : 'transparent'
  const fg = variant === 'solid' || on ? t.colors.bg : t.colors.text
  const border = variant === 'outline' ? t.colors.hairlineStrong : variant === 'soft' ? t.colors.hairline : 'transparent'
  const gap = size === 'sm' ? 6 : 8
  // With a meta value the name comes from the visible text itself, so voice control and the label match (WCAG 2.5.3).
  const name = accessibilityLabel ?? (meta ? undefined : label)
  const box = (pressed: boolean): StyleProp<ViewStyle> => [
    { flexDirection: 'row', alignItems: 'center', borderRadius: t.radii.pill, borderWidth: hairlineWidth, opacity: disabled ? 0.4 : ghost ? 0.55 : pressed ? 0.75 : 1 },
    ...variants({ size, variant }),
    { backgroundColor: bg, borderColor: on ? t.colors.text : border },
    style,
  ]
  const content = (
    <>
      {icon ? <View style={{ marginLeft: -2 }}>{icon}</View> : null}
      <Text numberOfLines={1} style={[typeStyle(t, size === 'sm' ? 'sm' : 'md', { weight: 'medium' }), { color: fg }]}>
        {label}
      </Text>
      {meta ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: on ? t.colors.bg : t.colors.textTertiary }]}>{meta}</Text> : null}
    </>
  )
  if (!onRemove) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityState={{ selected: on, disabled }}
        accessibilityLabel={name}
        testID={testID}
        hitSlop={6}
        style={({ pressed }) => box(pressed)}
      >
        {content}
      </Pressable>
    )
  }
  // With a remove control the pill is a plain row: the label area and the × are sibling buttons, never nested.
  return (
    <View style={box(false)} testID={testID}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityState={{ selected: on, disabled }}
        accessibilityLabel={name}
        hitSlop={6}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap, opacity: pressed ? 0.75 : 1 })}
      >
        {content}
      </Pressable>
      <Pressable onPress={onRemove} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} style={{ marginRight: -4, padding: 2 }}>
        <X size={14} strokeWidth={1.75} color={on ? t.colors.bg : t.colors.textTertiary} />
      </Pressable>
    </View>
  )
}

export default Chip
