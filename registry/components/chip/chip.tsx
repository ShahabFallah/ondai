import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { X } from 'lucide-react-native'
import { createVariants, type SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, typeStyle, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { BevelFill, CandyFill, GlassFace, LiquidChrome, Sweep } from '../surface/surface'

export interface ChipProps {
  label: string
  /** Secondary mono text (e.g. a count or a key). */
  meta?: string
  icon?: ReactNode
  variant?: 'soft' | 'outline' | 'solid' | 'ghost'
  /**
   * The look: `clean`, `minimal`, `glass` (lighter glass with a lit rim), `pop` (a small key with a ledge), `candy`
   * (a glossy sweet: pearl, or the tint when selected), `metal` (a brushed edge; liquid metal when `primary`),
   * `shine` or `bevel` (a small lit key). Defaults to the nearest SkinProvider.
   */
  skin?: SkinInput
  /** Selected colour override (hex). */
  tint?: string
  size?: 'sm' | 'md'
  selected?: boolean
  /**
   * Paint it as the skin's primary key (the tint, a candy, a chrome face, a lit key), for the one suggested
   * choice in a row. Wins over `variant` and `selected` for the paint.
   */
  primary?: boolean
  /**
   * Let a long label wrap onto more lines instead of ending in an ellipsis (smart replies, suggestions). The
   * chip keeps its pill ends on one line and rounds to a soft rectangle when it wraps.
   */
  multiline?: boolean
  /** Faded "suggested" look (inline ghost tags). */
  ghost?: boolean
  disabled?: boolean
  onPress?: () => void
  onRemove?: () => void
  /** The remove mark. A lucide icon component (sized and coloured for you), any element, or `null` to drop the remove control. */
  removeIcon?: IconInput
  /** Screen reader name of the remove control. Defaults to `Remove <label>`. */
  removeLabel?: string
  style?: StyleProp<ViewStyle>
  /** Applied to the label text after the chip's own. */
  textStyle?: StyleProp<TextStyle>
  testID?: string
  accessibilityLabel?: string
}

const variants = createVariants({
  variants: {
    size: { sm: { height: 26, paddingHorizontal: 10, gap: 5 }, md: { height: 32, paddingHorizontal: 12, gap: 6 } },
    variant: { soft: {}, outline: { backgroundColor: 'transparent' }, solid: {}, ghost: { backgroundColor: 'transparent', borderColor: 'transparent' } },
  },
  defaults: { size: 'md', variant: 'soft' },
})

const heights = { sm: 26, md: 32 } as const

/** Compact selectable pill used for tags, filters, suggestions and smart replies. */
export function Chip({ label, meta, icon, variant = 'soft', skin, tint, size = 'md', selected, primary, multiline, ghost, disabled, onPress, onRemove, removeIcon, removeLabel, style, textStyle, testID, accessibilityLabel }: ChipProps) {
  const t = useTheme()
  const s = useSkin(skin, tint)
  const on = !!selected
  // `clean` keeps the chip's own variants; other skins paint every non-ghost chip in their material.
  const skinned = s.skin !== 'clean' && variant !== 'ghost'
  const solid = variant === 'solid' || on
  const candy = s.skin === 'candy' && variant !== 'ghost'
  const metal = s.skin === 'metal'
  // Skins that paint the chip's body as a layer (a lit key, glass), so the box itself stays clear.
  const bevel = s.skin === 'bevel' && variant !== 'ghost'
  const glass = s.skin === 'glass' && variant !== 'ghost' && !!s.glass
  const layered = candy || bevel || glass || (primary && metal)
  // The ink and the fill: the primary key's paint, the skin's chip paint, or the clean variants.
  const p = s.primary
  const bg = primary ? (metal ? s.metal.face[1]! : p.fill) : skinned ? (solid ? s.chip.selectedFill : s.chip.fill) : solid ? (tint ?? t.colors.text) : variant === 'soft' ? t.colors.muted : variant === 'outline' ? t.colors.surface : 'transparent'
  const fg = primary ? (metal ? s.metal.liquid.ink : p.fg) : candy ? (solid ? s.chip.selectedFg : t.colors.text) : skinned ? (solid ? s.chip.selectedFg : s.chip.fg) : solid ? (tint ? s.onTint : t.colors.bg) : variant === 'ghost' ? t.colors.textSecondary : t.colors.text
  const filled = solid || !!primary
  const border = metal && (skinned || primary) ? s.metal.stroke[1] : primary ? p.border : skinned ? s.chip.border : variant === 'outline' ? t.colors.hairlineStrong : 'transparent'
  const h = heights[size]
  const r = multiline ? h / 2 : t.radii.pill

  // The skin's own box: borders, ledges and glows. Candy draws its border and gloss in CandyFill.
  let skinBox: ViewStyle | null = null
  if (candy) skinBox = { borderWidth: 0, boxShadow: (filled ? p : s.secondary).shadow } as ViewStyle
  else if (bevel) skinBox = { borderWidth: 0, boxShadow: (filled ? p : s.secondary).bevel?.drop } as ViewStyle
  else if (glass) skinBox = { borderWidth: 0 }
  else if (primary && metal) skinBox = { borderWidth: 0 }
  else if (primary && s.skin === 'pop') skinBox = { borderWidth: 1.5, boxShadow: `0 2px 0 0 ${p.side}, 0 2px 0 1.5px ${p.border}`, marginBottom: 2 } as ViewStyle
  else if (primary && s.skin !== 'clean') skinBox = { borderWidth: metal ? 1 : p.borderWidth || hairlineWidth, ...(p.shadow ? { boxShadow: p.shadow } : null) } as ViewStyle
  else if (skinned) skinBox = { borderWidth: metal ? 1 : s.chip.borderWidth || hairlineWidth, ...(s.chip.shadow && !solid ? { boxShadow: s.chip.shadow } : null), ...(s.skin === 'pop' ? { marginBottom: 2 } : null) } as ViewStyle

  // Painted layers under the label: a candy body, liquid metal, a lit key, glass, or a lit key's sweep.
  const face = candy ? (
    <CandyFill stops={(filled ? p : s.secondary).candy!} radius={r} />
  ) : primary && metal ? (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LiquidChrome radius={Math.min(r, h / 2)} width={2} skin={s} style={{ flex: 1 }} />
    </View>
  ) : bevel ? (
    <BevelFill stops={(filled ? p : s.secondary).bevel!} radius={Math.min(r, multiline ? h / 2 : 999)} />
  ) : glass ? (
    <GlassFace radius={Math.min(r, 999)} fill={primary ? p.fill : solid ? s.chip.selectedFill : s.chip.fill} edge={primary ? s.glass!.primary : s.glass!.control} shadow={primary ? p.shadow : s.chip.shadow} dark={s.dark} />
  ) : primary && s.skin === 'shine' ? (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden' }]}>
      <Sweep color={s.shine.sweep} period={4200} />
    </View>
  ) : null

  const gap = size === 'sm' ? 5 : 6
  // With a meta value the name comes from the visible text itself, so voice control and the label match (WCAG 2.5.3).
  const name = accessibilityLabel ?? (meta ? undefined : label)
  const box = (pressed: boolean): StyleProp<ViewStyle> => [
    { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', borderRadius: r, borderWidth: hairlineWidth },
    { opacity: disabled ? 0.4 : ghost ? (candy ? 0.6 : 0.5) : pressed && !candy ? 0.7 : 1, transform: [{ scale: pressed ? (candy ? 0.95 : 0.97) : 1 }] },
    ...variants({ size, variant }),
    multiline ? { height: 'auto', minHeight: h, paddingVertical: size === 'sm' ? 4 : 6 } : null,
    { backgroundColor: layered ? 'transparent' : bg, borderColor: on && !skinned && !primary ? t.colors.text : border },
    skinBox,
    style,
  ]
  const content = (
    <>
      {icon ? <View style={{ marginLeft: -2 }}>{icon}</View> : null}
      <Text numberOfLines={multiline ? undefined : 1} style={[typeStyle(t, size === 'sm' ? 'xs' : 'sm', { weight: 'medium' }), { color: fg, flexShrink: 1 }, textStyle]}>
        {label}
      </Text>
      {meta ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: filled ? fg : t.colors.textTertiary, opacity: filled ? 0.7 : 1 }]}>{meta}</Text> : null}
    </>
  )
  const removeMark = onRemove ? renderIcon(removeIcon, X, { size: 14, strokeWidth: 1.75, color: filled || candy ? fg : t.colors.textTertiary }) : null
  if (!removeMark) {
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
        {face}
        {content}
      </Pressable>
    )
  }
  // With a remove control the pill is a plain row: the label area and the × are sibling buttons, never nested.
  return (
    <View style={box(false)} testID={testID}>
      {face}
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityState={{ selected: on, disabled }}
        accessibilityLabel={name}
        hitSlop={6}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap, flexShrink: 1, opacity: pressed ? 0.75 : 1 })}
      >
        {content}
      </Pressable>
      <Pressable onPress={onRemove} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={removeLabel ?? `Remove ${label}`} style={{ marginRight: -4, padding: 2 }}>
        {removeMark}
      </Pressable>
    </View>
  )
}

export default Chip
