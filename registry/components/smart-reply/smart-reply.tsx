import { useEffect, useRef, useState, type ComponentRef, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { CornerDownLeft, RefreshCw } from 'lucide-react-native'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { BevelFill, CandyFill, ChromeRim, FaceGradient, frost, GlassFace, SkinRowFace, SkinTile, SkinWell, skinHasWells, Surface, Sweep } from '../surface/surface'
import { replyTones, type ReplyTone } from './prompts'
import { useSmartReply, type ThreadMessage, type UseSmartReplyOptions } from './use-smart-reply'

/** Every icon SmartReply draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface SmartReplyIcons {
  /** Leading icon on each reply chip (none by default). */
  reply: IconInput
  /** The trailing mark on each `stack` row. */
  insert: IconInput
  /** The `ghost` accept key. */
  accept: IconInput
  /** The "More" key. */
  more: IconInput
}

/** Every string SmartReply shows or announces. */
export interface SmartReplyLabels {
  /** The `ghost` field's placeholder. */
  placeholder: string
  /** Screen reader name of the `ghost` field. */
  inputLabel: string
  /** While the model writes replies (`chips`, `stack`) and the one ghost reply. */
  thinking: string
  thinkingOne: string
  more: string
  /** Screen reader names. */
  moreLabel: string
  accept: string
  /** Shown when the model has nothing to suggest. */
  empty: string
  /** Tone picker. */
  tone: string
  toneNeutral: string
  toneFriendly: string
  toneFormal: string
  toneBrief: string
}

export interface SmartReplyStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The `stack` panel and the `ghost` field. */
  panel: StyleProp<ViewStyle>
  /** One reply: a chip or a stack row, and its text. */
  reply: StyleProp<ViewStyle>
  replyText: StyleProp<TextStyle>
  tones: StyleProp<ViewStyle>
  footer: StyleProp<ViewStyle>
}

export const smartReplyLabels: SmartReplyLabels = {
  placeholder: 'Reply…',
  inputLabel: 'Reply',
  thinking: 'Thinking of replies',
  thinkingOne: 'Thinking of a reply',
  more: 'More',
  moreLabel: 'More suggestions',
  accept: 'Accept suggestion',
  empty: 'Nothing to suggest for this one.',
  tone: 'Tone',
  toneNeutral: 'Neutral',
  toneFriendly: 'Friendly',
  toneFormal: 'Formal',
  toneBrief: 'Brief',
}

export interface SmartReplyItemProps {
  text: string
  index: number
  /** The first reply when `highlight` is on. */
  primary: boolean
  onPress: () => void
}

export interface SmartReplyFooterProps {
  busy: boolean
  /** Ask for a fresh set. */
  more: () => void
}

export interface SmartReplyAcceptProps {
  suggestion: string
  accept: () => void
}

export interface SmartReplyProps extends UseSmartReplyOptions {
  /** The conversation (the last message is replied to) or just the last message. */
  thread: ThreadMessage[] | string
  onSelect: (text: string) => void
  /** Layout: wrapping `chips`, a `stack` of rows, or `ghost` text inside the reply field. */
  presentation?: 'chips' | 'stack' | 'ghost'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the
   * reply chips, the rows, the field and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Corner radius of the stack panel and the ghost field. Defaults to the variant's. */
  radius?: number
  /** Draw the first reply as the variant's primary key, the model's best guess. On by default. */
  highlight?: boolean
  /** Show a tone picker. */
  showTone?: boolean
  autoRun?: boolean
  showBadge?: boolean
  icons?: Partial<SmartReplyIcons>
  labels?: Partial<SmartReplyLabels>
  styles?: Partial<SmartReplyStyles>
  /** Draw one reply (a chip or a row) yourself. */
  renderReply?: (props: SmartReplyItemProps) => ReactNode
  /** Shown when the model returns nothing. Return null to show nothing. */
  renderEmpty?: () => ReactNode
  /** Replace the footer (badge and the More key). */
  renderFooter?: (props: SmartReplyFooterProps) => ReactNode
  /** Draw the `ghost` accept key yourself. */
  renderAccept?: (props: SmartReplyAcceptProps) => ReactNode
  /** Ghost presentation: the field's value and change handler. */
  value?: string
  onChangeText?: (text: string) => void
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<SmartReplyProps['size']>
const sizes: Record<Size, { font: FontSizeKey; pill: number; padH: number; icon: number; row: number; key: 'sm' | 'md'; tile: number; field: number; body: FontSizeKey; chip: 'sm' | 'md' }> = {
  sm: { font: 'xs', pill: 28, padH: 10, icon: 13, row: 40, key: 'sm', tile: 22, field: 40, body: 'sm', chip: 'sm' },
  md: { font: 'sm', pill: 34, padH: 13, icon: 14, row: 46, key: 'sm', tile: 24, field: 46, body: 'md', chip: 'sm' },
  lg: { font: 'md', pill: 40, padH: 16, icon: 16, row: 54, key: 'md', tile: 28, field: 54, body: 'lg', chip: 'md' },
}
type Z = (typeof sizes)[Size]

const toneKey: Record<ReplyTone, keyof SmartReplyLabels> = { neutral: 'toneNeutral', friendly: 'toneFriendly', formal: 'toneFormal', brief: 'toneBrief' }

/** Three reply suggestions for the last message, written on device: chips, a stack of rows, or ghost text in the field. */
export function SmartReply({ variant, tint, ...props }: SmartReplyProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <SmartReplyInner {...props} />
    </SkinProvider>
  )
}

function SmartReplyInner({
  thread,
  onSelect,
  presentation = 'chips',
  size = 'md',
  radius,
  highlight = true,
  showTone = false,
  autoRun = true,
  showBadge = true,
  icons = {},
  labels: labelsProp,
  styles = {},
  renderReply,
  renderEmpty,
  renderFooter,
  renderAccept,
  value = '',
  onChangeText,
  placeholder,
  style,
  testID,
  ...hookOptions
}: Omit<SmartReplyProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: SmartReplyLabels = { ...smartReplyLabels, ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  const sr = useSmartReply(hookOptions)
  const [tone, setTone] = useState<ReplyTone>(hookOptions.tone ?? 'neutral')
  const key = typeof thread === 'string' ? thread : thread.map((m) => m.text).join('|')
  const last = useRef<string>('')
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  useEffect(() => {
    if (!autoRun || !key || last.current === `${key}:${tone}`) return
    last.current = `${key}:${tone}`
    void sr.run(thread, tone).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tone, autoRun])

  const pick = (text: string) => {
    void Haptics.selectionAsync().catch(() => {})
    onSelect(text)
  }
  const more = () => void sr.run(thread, tone).catch(() => {})
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  const thinking = sr.isBusy && !sr.replies.length
  const emptyResult = sr.status === 'done' && !sr.replies.length
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))
  const fadeIn = (i: number) => (motion.enabled ? FadeInDown.delay(i * 50).duration(180) : undefined)

  const toneRow = showTone ? (
    <View accessibilityLabel={labels.tone} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.tones]}>
      {replyTones.map((x) => (
        <Chip key={x.id} label={labels[toneKey[x.id]]} size={z.chip} variant="soft" selected={tone === x.id} onPress={() => setTone(x.id)} />
      ))}
    </View>
  ) : null
  const footer = renderFooter ? (
    renderFooter({ busy: sr.isBusy, more })
  ) : (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }, styles.footer]}>
      {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={sr.status} provider={sr.provider} locality={sr.locality as never} /> : <View />}
      {!sr.isBusy && sr.status !== 'unavailable' ? (
        <Button
          title={labels.more}
          variant={quiet ? 'ghost' : 'raised'}
          size="sm"
          icon={keyIcon(icons.more, RefreshCw)}
          onPress={more}
          accessibilityLabel={labels.moreLabel}
          style={quiet ? { marginRight: -8 } : undefined}
        />
      ) : null}
    </View>
  )
  const errorView = sr.error ? <Note color={t.colors.textSecondary}>{sr.error.message}</Note> : null
  const emptyView = emptyResult ? (renderEmpty ? renderEmpty() : <Note color={t.colors.textTertiary}>{labels.empty}</Note>) : null

  if (presentation === 'ghost') {
    const suggestion = sr.replies[0] ?? ''
    const ghost = !value && suggestion
    const wells = skinHasWells(s.skin)
    const r = radius ?? (s.skin === 'clean' ? t.radii.md : s.radius.control + 2)
    const keySize = z.field - (wells ? 14 : 12)
    const accept = () => pick(suggestion)
    const acceptKey = !ghost ? null : renderAccept ? (
      renderAccept({ suggestion, accept })
    ) : (
      <Button variant={quiet ? 'soft' : 'solid'} size={z.key} icon={keyIcon(icons.accept, CornerDownLeft)} onPress={accept} accessibilityLabel={labels.accept} style={{ minWidth: keySize, minHeight: keySize }} />
    )
    const fieldPaint: ViewStyle | null = wells
      ? null
      : ({
          borderRadius: r,
          borderWidth: 1,
          borderColor: t.colors.hairlineStrong,
          backgroundColor: s.skin === 'minimal' ? 'transparent' : t.colors.input,
          ...(s.skin === 'clean' && t.scheme !== 'dark' ? { boxShadow: t.shadows.sm } : null),
        } as ViewStyle)
    return (
      <View style={[{ gap: 10 }, style, styles.container]} testID={testID}>
        {toneRow}
        <SkinWell radius={r} style={[{ minHeight: z.field, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, gap: 8, overflow: 'hidden' }, fieldPaint, styles.panel]}>
          {s.skin === 'shine' ? <Sweep color={s.dark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.035)'} period={6000} width={0.5} /> : null}
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            {ghost ? (
              <Text pointerEvents="none" style={[typeStyle(t, z.body), { position: 'absolute', left: 0, right: 0, color: t.colors.textTertiary }, styles.replyText]} numberOfLines={1}>
                {suggestion}
              </Text>
            ) : !value && thinking ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0 }}>
                <ShimmerText size={z.body} weight="regular" active>
                  {labels.thinkingOne}
                </ShimmerText>
              </View>
            ) : null}
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder={ghost || thinking ? '' : labels.placeholder}
              accessibilityLabel={labels.inputLabel}
              placeholderTextColor={t.colors.textTertiary}
              selectionColor={s.tint}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === 'Tab' && ghost) {
                  e.preventDefault?.()
                  accept()
                }
              }}
              style={[typeStyle(t, z.body), { color: t.colors.text, paddingVertical: 10 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
          </View>
          {acceptKey}
        </SkinWell>
        {errorView}
        {emptyView}
        {footer}
      </View>
    )
  }

  if (presentation === 'stack') {
    const rows: Array<string | number> = thinking ? [0.72, 0.56, 0.64] : sr.replies
    const wells = skinHasWells(s.skin)
    const rowR = Math.max(8, s.radius.control)
    return (
      <View style={[{ gap: 10 }, style, styles.container]} testID={testID}>
        {toneRow}
        {thinking ? (
          <ShimmerText size="sm" active>
            {labels.thinking}
          </ShimmerText>
        ) : null}
        {errorView}
        {emptyView}
        {rows.length ? (
          <Surface radius={radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 4)} style={[{ padding: wells ? 6 : 0, gap: wells ? 2 : 0, overflow: wells ? 'visible' : 'hidden' }, styles.panel]}>
            {rows.map((r, i) => (
              <View key={typeof r === 'string' ? `${r}-${i}` : `s${i}`} style={i > 0 && !wells ? { borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline } : null}>
                {typeof r === 'number' ? (
                  <View style={{ minHeight: z.row, justifyContent: 'center', paddingHorizontal: 14 }}>
                    <Skeleton width={`${Math.round(r * 100)}%`} height={10} radius={5} />
                  </View>
                ) : renderReply ? (
                  <Animated.View entering={fadeIn(i)}>{renderReply({ text: r, index: i, primary: highlight && i === 0, onPress: () => pick(r) })}</Animated.View>
                ) : (
                  <Animated.View entering={fadeIn(i)}>
                    <Pressable onPress={() => pick(r)} accessibilityRole="button" style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: z.row, paddingLeft: wells ? 10 : 14, paddingRight: wells ? 6 : 14, paddingVertical: 8, borderRadius: wells ? rowR : 0 }, styles.reply]}>
                      {(st) => {
                        const on = st.pressed || (st as { hovered?: boolean }).hovered
                        const primary = highlight && i === 0
                        return (
                          <>
                            {primary ? <PrimaryFace radius={wells ? rowR : 0} s={s} /> : on ? wells ? <SkinRowFace radius={rowR} /> : <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: s.rowHover }} /> : null}
                            <Text style={[typeStyle(t, z.body), { color: primary ? primaryInk(s) : s.skin === 'metal' && on ? s.metal.plateInk : t.colors.text, flex: 1 }, styles.replyText]}>{r}</Text>
                            <InsertMark icon={icons.insert} z={z} s={s} primary={primary} />
                          </>
                        )
                      }}
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            ))}
          </Surface>
        ) : null}
        {footer}
      </View>
    )
  }

  return (
    <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
      {toneRow}
      {thinking ? (
        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          <ShimmerText size="xs" active style={{ alignSelf: 'flex-end' }}>
            {labels.thinking}
          </ShimmerText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
            {[188, 132, 156].map((w, i) => (
              <Skeleton key={i} width={w} height={z.pill} radius={z.pill / 2} />
            ))}
          </View>
        </View>
      ) : null}
      {sr.replies.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
          {sr.replies.map((r, i) => (
            <Animated.View key={`${r}-${i}`} entering={fadeIn(i)} style={{ maxWidth: '100%' }}>
              {renderReply ? renderReply({ text: r, index: i, primary: highlight && i === 0, onPress: () => pick(r) }) : <ReplyPill text={r} z={z} primary={highlight && i === 0} icon={icons.reply} onPress={() => pick(r)} style={styles.reply} textStyle={styles.replyText} />}
            </Animated.View>
          ))}
        </View>
      ) : null}
      {errorView}
      {emptyView}
      {footer}
    </View>
  )
}

/** A status line (empty, error). On `glass` it sits on a small frosted plate, so it reads over whatever is behind. */
function Note({ children, color }: { children: ReactNode; color: string }) {
  const t = useTheme()
  const s = useSkin()
  const text = <Text style={[typeStyle(t, 'sm'), { color }]}>{children}</Text>
  if (s.skin !== 'glass') return text
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: s.radius.control, backgroundColor: s.secondary.fill, borderWidth: 1, borderColor: s.secondary.border, ...(Platform.OS === 'web' ? frost : null) }}>{text}</View>
}

/** Ink on the variant's primary key. */
function primaryInk(s: SkinTokens) {
  return s.skin === 'metal' ? s.metal.faceInk : s.primary.fg
}

/** The variant's primary key face, filling its parent: a tinted keycap, a candy, liquid chrome, a lit key, tinted glass. */
function PrimaryFace({ radius, s }: { radius: number; s: SkinTokens }) {
  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius }
  const p = s.primary
  switch (s.skin) {
    case 'pop':
      return <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: 2, borderColor: p.border, boxShadow: `0 3px 0 0 ${p.side}, 0 3px 0 2px ${p.border}` } as ViewStyle]} />
    case 'candy':
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: p.shadow } as ViewStyle]}>
          <CandyFill stops={p.candy!} radius={radius} />
        </View>
      )
    case 'metal':
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: p.shadow } as ViewStyle]}>
          <ChromeRim radius={radius} width={1.5} skin={s} face={s.metal.face} style={{ flex: 1 }} />
        </View>
      )
    case 'shine':
      return (
        <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border, overflow: 'hidden', boxShadow: p.shadow } as ViewStyle]}>
          <Sweep color={s.shine.sweep} period={4200} />
        </View>
      )
    case 'bevel':
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: p.bevel?.drop } as ViewStyle]}>
          <BevelFill stops={p.bevel!} radius={radius} />
        </View>
      )
    case 'glass':
      if (s.glass) return <GlassFace radius={radius} fill={p.fill} edge={s.glass.primary} shadow={p.shadow} blur={16} dark={s.dark} />
      return <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border, boxShadow: p.shadow } as ViewStyle]} />
    default:
      return <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border, boxShadow: p.shadow } as ViewStyle]} />
  }
}

/**
 * One reply as a pill in the variant's material. Unlike a Chip it wraps, so a long reply stays readable.
 * `clean` is a white pill with a hairline, `minimal` a hairline only, and the expressive looks draw their
 * secondary key: a keycap with a side, a glossy pearl, a steel plate, frosted glass, a lit key, a lit sheen.
 */
function ReplyPill({ text, z, primary, icon, onPress, style, textStyle }: { text: string; z: Z; primary: boolean; icon: IconInput | undefined; onPress: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const t = useTheme()
  const s = useSkin()
  const r = Math.min(z.pill / 2, 18)
  const pop = s.skin === 'pop'
  const ink = primary ? primaryInk(s) : s.skin === 'metal' ? s.metal.plateInk : t.colors.text
  const lead = renderIcon(icon, null, { size: z.icon, strokeWidth: 1.75, color: primary ? ink : t.colors.textSecondary })
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={{ marginBottom: pop ? 4 : 0 }}>
      {(st) => {
        const { pressed, hovered } = st as { pressed: boolean; hovered?: boolean }
        const base: ViewStyle = { minHeight: z.pill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: z.padH, paddingVertical: 6, borderRadius: r }
        const press: ViewStyle = { transform: pop ? [{ translateY: pressed ? 3 : 0 }] : [{ scale: pressed ? 0.97 : hovered && (s.skin === 'shine' || s.skin === 'candy') ? 1.015 : 1 }] }
        return (
          <View style={[base, paint(s, t, primary, pressed || !!hovered), press, style]}>
            {primary ? <PrimaryFace radius={r} s={s} /> : <PillFace radius={r} s={s} pressed={pressed} />}
            {lead ? <View>{lead}</View> : null}
            <Text style={[typeStyle(t, z.font, { weight: 'medium' }), { color: ink, flexShrink: 1 }, textStyle]}>{text}</Text>
          </View>
        )
      }}
    </Pressable>
  )
}

/** Fill and edge drawn as plain styles (the quiet looks and glass); the expressive faces are drawn by PillFace. */
function paint(s: SkinTokens, t: ReturnType<typeof useTheme>, primary: boolean, active: boolean): ViewStyle | null {
  if (primary) return null
  switch (s.skin) {
    case 'clean':
      return { backgroundColor: active ? t.colors.muted : t.colors.surface, borderWidth: 1, borderColor: t.colors.hairlineStrong, ...(s.dark ? null : { boxShadow: '0 1px 2px rgba(16,16,20,0.06)' }) } as ViewStyle
    case 'minimal':
      return { backgroundColor: active ? t.colors.muted : 'transparent', borderWidth: 1, borderColor: t.colors.hairlineStrong }
    case 'glass':
      return s.glass ? null : ({ backgroundColor: s.secondary.fill, borderWidth: 1, borderColor: s.secondary.border, boxShadow: s.secondary.shadow } as ViewStyle)
    case 'shine':
      return { borderWidth: 1, borderColor: t.colors.hairlineStrong, overflow: 'hidden' }
    default:
      return null
  }
}

/** The expressive pill faces: a keycap, a pearl, a steel plate, frosted glass, a lit key, a satin face with a sweep. */
function PillFace({ radius, s, pressed }: { radius: number; s: SkinTokens; pressed: boolean }) {
  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius }
  switch (s.skin) {
    case 'pop': {
      const p = s.secondary
      return <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: 2, borderColor: p.border, boxShadow: pressed ? `0 0 0 0 ${p.side}` : `0 3px 0 0 ${p.side}, 0 3px 0 2px ${p.border}` } as ViewStyle]} />
    }
    case 'candy':
    case 'metal':
      return <SkinRowFace radius={radius} />
    case 'glass':
      // Frosted, with its own lit rim: the pills often sit straight on the app, so they blur what is behind.
      return s.glass ? <GlassFace radius={radius} fill={s.secondary.fill} edge={s.glass.control} shadow={s.secondary.shadow} blur={16} dark={s.dark} /> : null
    case 'bevel': {
      // A lit paper or charcoal key; the drop tightens while it is pressed.
      const b = s.secondary.bevel!
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: pressed ? `0 1px 1px rgba(0,0,0,${s.dark ? 0.5 : 0.08})` : b.drop } as ViewStyle]}>
          <BevelFill stops={b} radius={radius} />
        </View>
      )
    }
    case 'shine':
      return (
        <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
          <FaceGradient radius={radius} stops={s.dark ? ['#26262B', '#18181B'] : ['#FFFFFF', '#F1F1F3']} />
          <Sweep color={s.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,1)'} period={5200} width={0.6} />
        </View>
      )
    default:
      return null
  }
}

/** The trailing insert mark on a stack row: on the variant's tile in the expressive looks, bare otherwise. */
function InsertMark({ icon, z, s, primary }: { icon: IconInput | undefined; z: Z; s: SkinTokens; primary: boolean }) {
  const t = useTheme()
  const wells = skinHasWells(s.skin)
  const glyph = renderIcon(icon, CornerDownLeft, { size: z.icon, strokeWidth: 1.75, color: primary ? primaryInk(s) : wells ? s.tile.ink : t.colors.textTertiary })
  if (!glyph) return null
  if (wells && !primary) return <SkinTile size={z.tile}>{glyph}</SkinTile>
  return <View style={{ width: z.tile, alignItems: 'center' }}>{glyph}</View>
}

export default SmartReply
