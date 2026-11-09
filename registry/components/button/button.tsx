import { isValidElement, useEffect, type ComponentType, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { createVariants, curves, timings, type SkinInput, type SkinTokens } from '@ondai/tokens'
import { typeStyle, useMotion, useSkin, useTheme, type IconProps } from '@ondai/tokens/react'
import { BevelFill, BrushedStroke, CandyFill, GlassFace, LiquidChrome, ShineRim, Surface, Sweep } from '../surface/surface'

/** An icon slot on a button: an element as you drew it, or an icon component (a lucide icon) the button colours and sizes. */
export type ButtonIcon = ReactNode | ComponentType<IconProps>

export interface ButtonProps {
  title?: string
  icon?: ButtonIcon
  /** Icon after the title (an arrow, a chevron). */
  iconRight?: ButtonIcon
  /**
   * The role. `solid` is the one primary action. `raised` is a soft physical key. `outline` and `soft` are
   * secondary. `accent` is reserved for the one AI action on a screen. `ghost` is a quiet text action.
   * The skin decides how each role looks.
   */
  variant?: 'solid' | 'raised' | 'soft' | 'outline' | 'ghost' | 'accent' | 'danger'
  /**
   * The look: `clean`, `minimal`, `glass` (frosted, lit rim), `pop` (a pushable 3D key), `candy` (glossy), `metal`
   * (a liquid-metal primary key, quiet secondary keys), `shine` (a light that sweeps across) or `bevel` (a lit 3D key).
   * Defaults to the nearest SkinProvider.
   */
  skin?: SkinInput
  /** Primary colour override (hex). Defaults to the accent. */
  tint?: string
  size?: 'sm' | 'md' | 'lg'
  /** Corner radius override. */
  radius?: number
  loading?: boolean
  disabled?: boolean
  /** Fill the row. */
  block?: boolean
  onPress?: () => void
  /** The finger lands (hold-to-talk starts here). */
  onPressIn?: () => void
  /** The finger lifts or slides off. */
  onPressOut?: () => void
  /**
   * Hold the key down from outside: `true` keeps it sunk (pop), squashed (candy) or scaled, whatever the finger
   * does, `false` keeps it up. Leave it out and the key follows the finger.
   */
  pressed?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
}

const variants = createVariants({
  variants: {
    size: {
      sm: { minHeight: 32, paddingHorizontal: 12, gap: 6 },
      md: { minHeight: 38, paddingHorizontal: 14, gap: 7 },
      lg: { minHeight: 46, paddingHorizontal: 18, gap: 8 },
    },
  },
  defaults: { size: 'md' },
})

const heights = { sm: 32, md: 38, lg: 46 } as const
const iconSizes = { sm: 15, md: 16, lg: 18 } as const
const EASE_OUT = Easing.bezier(...curves.out)
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const isIconComponent = (x: unknown): x is ComponentType<IconProps> =>
  typeof x === 'function' || (typeof x === 'object' && x !== null && !isValidElement(x) && '$$typeof' in (x as object))

function drawIcon(icon: ButtonIcon, color: string, size: number): ReactNode {
  if (isIconComponent(icon)) {
    const Icon = icon
    return <Icon size={size} color={color} strokeWidth={1.9} />
  }
  return icon
}

/** The raised key's face: a top-lit vertical gradient that flips when pressed. */
function KeyFace({ dark, pressed, radius }: { dark: boolean; pressed: boolean; radius: number }) {
  const [top, bottom] = dark ? ['#2E2E33', '#1E1E22'] : ['#FFFFFF', '#EBEBEE']
  const [a, b] = pressed ? [bottom, top] : [top, bottom]
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <LinearGradient id="ondai-key" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill="url(#ondai-key)" />
    </Svg>
  )
}

type Role = 'primary' | 'secondary' | 'plain'
const roleOf = (variant: NonNullable<ButtonProps['variant']>): Role => (variant === 'solid' || variant === 'accent' ? 'primary' : variant === 'raised' || variant === 'outline' || variant === 'soft' ? 'secondary' : 'plain')

/** Compact button. Labels are one line and shrink with an ellipsis rather than overflow. */
export function Button({ title, icon, iconRight, variant = 'solid', skin: skinProp, tint, size = 'md', radius, loading, disabled, block, onPress, onPressIn, onPressOut, pressed: held, style, testID, accessibilityLabel }: ButtonProps) {
  const t = useTheme()
  const s = useSkin(skinProp, tint)
  const motion = useMotion()
  const press = useSharedValue(0)
  const hover = useSharedValue(0)
  const dark = t.scheme === 'dark'
  const skin = s.skin
  const role = roleOf(variant)
  const base = skin === 'clean' ? 10 : s.radius.control
  const r = radius ?? base + (size === 'sm' ? -2 : size === 'lg' ? 2 : 0)
  const iconOnly = !title
  const dim = heights[size]
  const iSize = iconSizes[size]

  // The look for this role in this skin. `plain` roles (ghost, danger) keep their quiet look in every skin.
  const skinned = skin !== 'clean' && role !== 'plain'
  const paint = role === 'primary' ? s.primary : s.secondary
  const clean = {
    solid: { bg: tint ?? t.colors.text, fg: tint ? s.onTint : t.colors.bg, shadow: dark ? undefined : '0 1px 2px rgba(16,16,20,0.16)' },
    raised: {
      bg: 'transparent',
      fg: t.colors.text,
      shadow: dark
        ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
        : 'inset 0 1px 0 #FFFFFF, inset 0 -1px 0 rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.11), 0 1px 2px rgba(16,16,20,0.12), 0 3px 8px rgba(16,16,20,0.06)',
    },
    soft: { bg: t.colors.muted, fg: t.colors.text, shadow: undefined },
    outline: { bg: t.colors.surface, fg: t.colors.text, shadow: t.shadows.ring },
    ghost: { bg: 'transparent', fg: t.colors.textSecondary, shadow: undefined },
    accent: { bg: tint ?? t.colors.accent.solid, fg: tint ? s.onTint : t.colors.onAccent, shadow: undefined },
    danger: { bg: t.colors.dangerSoft, fg: t.colors.danger, shadow: undefined },
  }[variant]
  const fg = skinned ? paint.fg : clean.fg
  // Pop keys: the primary key shows a tall side (10pt at md), secondary keys a shorter one.
  const depth = skin === 'pop' && skinned ? (role === 'primary' ? s.depth[size] : s.depthSecondary[size]) : 0

  // Press and hover. Pop sinks the face; candy squashes and tilts; the rest scale a touch.
  const pressStyle = useAnimatedStyle(() => {
    if (depth) return { transform: [{ translateY: press.value * depth + hover.value * Math.min(1.5, depth / 3) * (1 - press.value) }] }
    if (skin === 'candy' && skinned) return { transform: [{ scale: 1 - press.value * 0.05 + hover.value * 0.015 }, { rotate: `${press.value}deg` }] }
    if (skin === 'shine' && skinned) return { transform: [{ scale: 1 - press.value * 0.03 + hover.value * 0.01 }] }
    // A lit key presses in: it drops half a point and shrinks a touch, and lifts a hair on hover.
    if (skin === 'bevel' && skinned) return { transform: [{ translateY: press.value * 0.5 - hover.value * 0.5 * (1 - press.value) }, { scale: 1 - press.value * 0.025 }] }
    return { transform: [{ scale: 1 - press.value * 0.03 }] }
  }, [press, hover, depth, skin, skinned])
  // Feedback on press-in, release on press-out: a short ease-out, never a spring for a tap.
  // With motion off the key still moves, just without the tween.
  const pressTo = (v: number) => {
    press.value = motion.enabled ? withTiming(v, { duration: v ? (depth ? 90 : timings.press) : 150, easing: EASE_OUT }) : v
  }
  const controlled = held !== undefined
  useEffect(() => {
    if (controlled) pressTo(held ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, held, motion.enabled, depth])
  const hoverTo = (v: number) => {
    hover.value = motion.enabled ? withSpring(v, { duration: 300, dampingRatio: 0.7 }) : 0
  }

  const label = title ? (
    <Text numberOfLines={1} style={[typeStyle(t, size === 'sm' ? 'sm' : 'md', { weight: 'medium' }), { color: fg, flexShrink: 1 }]}>
      {title}
    </Text>
  ) : null
  const leading = loading ? <ActivityIndicator size="small" color={fg} /> : icon ? drawIcon(icon, fg, iSize) : null
  const inner = (
    <>
      {leading ? <View>{leading}</View> : null}
      {label}
      {iconRight && !loading ? <View style={{ marginRight: -2 }}>{drawIcon(iconRight, fg, iSize)}</View> : null}
    </>
  )
  const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: r }
  const sizing = [...variants({ size }), iconOnly && { paddingHorizontal: 0, width: dim }]

  const face = (pressed: boolean) => {
    if (!skinned) {
      const material = t.material !== 'solid' && (variant === 'outline' || variant === 'soft')
      if (material)
        return (
          <Surface skin="clean" radius={r} elevation={variant === 'soft' ? 'inset' : 'card'} interactive style={[row, ...sizing]}>
            {inner}
          </Surface>
        )
      const pressedShadow = dark ? 'inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.6)' : 'inset 0 1px 2px rgba(16,16,20,0.1), 0 0 0 1px rgba(0,0,0,0.12)'
      const raised = variant === 'raised'
      return (
        <View style={[row, { backgroundColor: clean.bg }, clean.shadow ? ({ boxShadow: raised && pressed ? pressedShadow : clean.shadow } as ViewStyle) : null, ...sizing]}>
          {raised ? <KeyFace dark={dark} pressed={pressed} radius={r} /> : null}
          {inner}
        </View>
      )
    }
    return <SkinnedFace s={s} role={role} r={r} size={size} depth={depth} sizing={sizing} row={row}>{inner}</SkinnedFace>
  }

  const floor = 3
  const body = (pressed: boolean) =>
    depth ? (
      // The pushable key: the side sits still underneath with a flat floor below; the face travels down onto it.
      <View style={{ paddingBottom: depth + floor }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: depth, bottom: floor, borderRadius: r, backgroundColor: paint.side, borderWidth: paint.borderWidth, borderColor: paint.border, boxShadow: `0 ${floor}px 0 0 ${paint.floor ?? 'transparent'}` } as ViewStyle} />
        <Animated.View style={pressStyle}>{face(pressed)}</Animated.View>
      </View>
    ) : (
      face(pressed)
    )

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!controlled) pressTo(1)
        onPressIn?.()
      }}
      onPressOut={() => {
        if (!controlled) pressTo(0)
        onPressOut?.()
      }}
      onHoverIn={() => hoverTo(1)}
      onHoverOut={() => hoverTo(0)}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      hitSlop={size === 'sm' ? 8 : 4}
      style={[{ borderRadius: r, opacity: disabled ? 0.45 : 1 }, block ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, depth ? null : pressStyle, style]}
    >
      {({ pressed }) => body(held ?? pressed)}
    </AnimatedPressable>
  )
}

/** One face per skin. Everything here reads colours from the resolved skin, so mono, accents and `tint` all work. */
function SkinnedFace({ s, role, r, size, depth, sizing, row, children }: { s: SkinTokens; role: Role; r: number; size: NonNullable<ButtonProps['size']>; depth: number; sizing: Array<StyleProp<ViewStyle>>; row: ViewStyle; children: ReactNode }) {
  const paint = role === 'primary' ? s.primary : s.secondary
  const shadow = paint.shadow ? ({ boxShadow: paint.shadow } as ViewStyle) : null
  switch (s.skin) {
    case 'pop':
      return (
        <View style={[row, { backgroundColor: paint.fill, borderWidth: paint.borderWidth, borderColor: paint.border }, ...sizing, depth ? { minHeight: (sizing[0] as ViewStyle | undefined)?.minHeight } : null]}>
          {/* A faint top light on the face, so it reads as a keycap and not a flat tile. */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, marginHorizontal: r * 0.6, backgroundColor: s.dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.6)' }} />
          {children}
        </View>
      )
    case 'candy': {
      const stops = paint.candy!
      return (
        <View style={[row, shadow, ...sizing]}>
          <CandyFill stops={stops} radius={r} />
          {children}
        </View>
      )
    }
    case 'metal':
      // Only the primary key is liquid metal: a flowing chrome rim round the body. Secondary keys stay quiet,
      // a plain plate with a fine brushed hairline.
      if (role === 'primary')
        return (
          <View style={[{ borderRadius: r }, shadow]}>
            <LiquidChrome radius={r} width={size === 'lg' ? 3 : size === 'sm' ? 2 : 2.5} skin={s} contentStyle={[row, ...sizing]}>
              {children}
            </LiquidChrome>
          </View>
        )
      return (
        <View style={[row, { backgroundColor: paint.fill }, shadow, ...sizing]}>
          <BrushedStroke radius={r} stops={s.metal.stroke} width={1} />
          {children}
        </View>
      )
    case 'bevel': {
      const b = paint.bevel!
      return (
        <View style={[row, { boxShadow: b.drop } as ViewStyle, ...sizing]}>
          <BevelFill stops={b} radius={r} />
          {children}
        </View>
      )
    }
    case 'shine':
      if (role === 'primary')
        return (
          <View style={[{ borderRadius: r }, shadow]}>
            <ShineRim radius={r} skin={s} fill={paint.fill} borderColor={paint.border} contentStyle={[row, ...sizing]}>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden' }]}>
                <Sweep color={s.shine.sweep} />
              </View>
              {children}
            </ShineRim>
          </View>
        )
      return (
        <View style={[row, { backgroundColor: paint.fill, borderWidth: paint.borderWidth, borderColor: paint.border }, ...sizing]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden' }]}>
            <Sweep color={s.dark ? 'rgba(255,255,255,0.12)' : 'rgba(9,9,11,0.06)'} period={5200} />
          </View>
          {children}
        </View>
      )
    case 'glass':
      // Frosted keys with their own lit rim: the primary in ink, white or the tint; the rest on lighter glass.
      return (
        <View style={[row, ...sizing]}>
          {s.glass ? <GlassFace radius={r} fill={paint.fill} edge={role === 'primary' ? s.glass.primary : s.glass.control} shadow={paint.shadow} blur={16} dark={s.dark} /> : null}
          {children}
        </View>
      )
    default:
      // minimal
      return <View style={[row, { backgroundColor: paint.fill, borderWidth: paint.borderWidth, borderColor: paint.border }, shadow, ...sizing]}>{children}</View>
  }
}

export default Button
