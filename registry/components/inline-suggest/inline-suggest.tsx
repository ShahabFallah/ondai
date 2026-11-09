import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Platform, Text, TextInput, View, type StyleProp, type TextInputKeyPressEvent, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { ArrowRightToLine } from 'lucide-react-native'
import { useStreamText } from '@ondai/core'
import { alpha, type FontSizeKey, type SkinInput } from '@ondai/tokens'
import { SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { KeyHint } from '../key-hint/key-hint'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinWell, skinHasWells, Surface } from '../surface/surface'

/** Every icon InlineSuggest draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface InlineSuggestIcons {
  /** On the key that takes the suggestion. */
  accept: IconInput
}

/** Every string InlineSuggest shows or announces. */
export interface InlineSuggestLabels {
  placeholder: string
  /** The key that takes the suggestion. */
  accept: string
  /** Beside the Tab key hint on a hardware keyboard. */
  hintKeyboard: string
  /** On touch screens, while a suggestion waits. */
  hintTouch: string
  /** While the model guesses. */
  thinking: string
  /** Screen reader prefix for the waiting suggestion. */
  suggestion: string
}

export interface InlineSuggestStyles {
  /** The panel. */
  container: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  /** The ghost text after the caret. */
  ghost: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
  hint: StyleProp<TextStyle>
}

export const inlineSuggestLabels: InlineSuggestLabels = {
  placeholder: 'Write a message',
  accept: 'Add',
  hintKeyboard: 'to take the rest',
  hintTouch: 'Suggestion ready',
  thinking: 'Thinking ahead',
  suggestion: 'Suggestion',
}

/** What a custom accept key or hint gets. */
export interface SuggestSlotProps {
  /** The text the suggestion would add, with its leading space. Empty when there is none. */
  suggestion: string
  /** The model is guessing. */
  thinking: boolean
  accept: () => void
}

export interface InlineSuggestProps {
  /** Controlled text. Leave out to let the field keep its own. */
  value?: string
  defaultValue?: string
  onChangeText?: (text: string) => void
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  /** What the person is writing, for better guesses: "A message to Priya about Friday's dinner". */
  context?: string
  /** Characters before the first suggestion. */
  minChars?: number
  /** Quiet time after the last keystroke before asking the model. */
  debounceMs?: number
  /** Called when a suggestion is taken, with the text it added. */
  onAccept?: (added: string) => void
  /** Lines before the field scrolls. */
  maxLines?: number
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the panel,
   * the well the text sits in and the accept key together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the accept key, the caret and the ghost text. Defaults to the accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  icons?: Partial<InlineSuggestIcons>
  labels?: Partial<InlineSuggestLabels>
  styles?: Partial<InlineSuggestStyles>
  /** The "On device" badge in the footer while nothing is suggested. */
  showBadge?: boolean
  /** Draw the accept key yourself. */
  renderAccept?: (props: SuggestSlotProps) => ReactNode
  /** Replace the hint at the left of the footer. */
  renderHint?: (props: SuggestSlotProps) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

const SYSTEM =
  'You complete the text a person is typing. Reply with only the next few words that continue it naturally (at most 10 words). No quotes, no explanation, do not repeat their text.'

/** Join the typed text and the model's continuation with exactly the right space. */
export function joinSuggestion(typed: string, suggestion: string): string {
  const s = suggestion.replace(/^["“]|["”]$/g, '').replace(/\s+/g, ' ')
  if (!s.trim()) return ''
  const needsSpace = !/\s$/.test(typed) && !/^[\s.,;:!?)]/.test(s)
  const trimmed = /\s$/.test(typed) ? s.trimStart() : s
  return (needsSpace ? ' ' : '') + trimmed.trimEnd()
}

type Size = NonNullable<InlineSuggestProps['size']>
const sizes: Record<Size, { font: FontSizeKey; hint: FontSizeKey; padX: number; padY: number; key: 'sm' | 'md'; gap: number }> = {
  sm: { font: 'md', hint: 'xs', padX: 12, padY: 10, key: 'sm', gap: 6 },
  md: { font: 'lg', hint: 'sm', padX: 14, padY: 12, key: 'sm', gap: 8 },
  lg: { font: 'xl', hint: 'md', padX: 16, padY: 14, key: 'md', gap: 10 },
}

/**
 * A text field that offers the rest of the sentence as quiet ghost text while the person types.
 * Press Tab on a keyboard, or the Add key, to take it; keep typing to ignore it.
 * The model only runs after a pause, and a stale guess is never shown against newer text.
 */
export function InlineSuggest({ variant, tint, ...props }: InlineSuggestProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Suggest {...props} tinted={!!tint} />
    </SkinProvider>
  )
}

function Suggest({
  value,
  defaultValue = '',
  onChangeText,
  placeholder,
  context,
  minChars = 8,
  debounceMs = 450,
  onAccept,
  maxLines = 6,
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  showBadge = true,
  renderAccept,
  renderHint,
  style,
  testID,
  tinted,
}: Omit<InlineSuggestProps, 'variant' | 'tint'> & { tinted: boolean }) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: InlineSuggestLabels = { ...inlineSuggestLabels, ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  const [own, setOwn] = useState(defaultValue)
  const text = value ?? own
  const stream = useStreamText({ component: 'inline-suggest', maxOutputTokens: 24, temperature: 0.2 })
  const askedFor = useRef<string | null>(null)
  const [ghost, setGhost] = useState('')
  const body = typeStyle(t, z.font)
  const line = body.lineHeight ?? 22
  const wells = skinHasWells(s.skin)

  const change = (next: string) => {
    if (value === undefined) setOwn(next)
    onChangeText?.(next)
  }

  // Ask after a pause; a newer keystroke cancels the wait and hides the old guess.
  useEffect(() => {
    setGhost('')
    askedFor.current = null
    if (text.trim().length < minChars) return
    const h = setTimeout(() => {
      askedFor.current = text
      const prompt = context ? `${context}\n\nText so far:\n${text}` : text
      void stream.run(prompt, { system: SYSTEM }).catch(() => {})
    }, debounceMs)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, minChars, debounceMs, context])

  useEffect(() => {
    if (askedFor.current === text) setGhost(joinSuggestion(text, stream.text))
  }, [stream.text, text])

  const accept = () => {
    if (!ghost) return
    change(text + ghost)
    onAccept?.(ghost)
    setGhost('')
  }
  const onKeyPress = (e: TextInputKeyPressEvent) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Tab' && ghost) {
      e.preventDefault()
      accept()
    }
  }
  const thinking = !ghost && stream.isBusy && askedFor.current === text
  const slot: SuggestSlotProps = { suggestion: ghost, thinking, accept }

  const pad = { paddingHorizontal: wells ? z.padX - 2 : z.padX, paddingTop: z.padY, paddingBottom: z.padY }
  const textBox = [body, pad, { minHeight: line * 2 + z.padY * 2, maxHeight: line * maxLines + z.padY * 2 }]
  // With a tint the guess takes a soft wash of it; otherwise it stays a quiet grey.
  const ghostColor = tinted && s.tint.startsWith('#') ? alpha(s.tint, s.dark ? 0.75 : 0.62) : t.colors.textTertiary

  // The ghost layer sits in the flow and sizes the field: the typed text drawn invisibly, then the suggestion, so the
  // guess lands right after the caret and a long one grows the field instead of spilling out of it. The real input
  // lies over it.
  const field = (
    <View>
      <Text pointerEvents="none" accessible={false} style={[textBox, { color: 'transparent' }, styles.input]}>
        {text || ' '}
        <Text style={[{ color: ghostColor }, styles.ghost]}>{ghost}</Text>
      </Text>
      <TextInput
        value={text}
        onChangeText={change}
        onKeyPress={onKeyPress}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        multiline
        accessibilityLabel={labels.placeholder}
        accessibilityHint={ghost ? `${labels.suggestion}: ${ghost.trim()}` : undefined}
        selectionColor={s.tint}
        testID={testID ? `${testID}-input` : undefined}
        style={[textBox, { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, minHeight: undefined, color: t.colors.text, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null, styles.input]}
      />
    </View>
  )

  const hintText = [typeStyle(t, z.hint), { color: t.colors.textSecondary }, styles.hint]
  const hint = renderHint ? (
    renderHint(slot)
  ) : ghost ? (
    <Animated.View entering={motion.enabled ? FadeIn.duration(150) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      {Platform.OS === 'web' ? <KeyHint keys={['tab']} size="sm" /> : null}
      <Text numberOfLines={1} style={[hintText, { flexShrink: 1 }]}>
        {Platform.OS === 'web' ? labels.hintKeyboard : labels.hintTouch}
      </Text>
    </Animated.View>
  ) : thinking ? (
    <ShimmerText size={z.hint === 'xs' ? 'xs' : 'sm'} active>
      {labels.thinking}
    </ShimmerText>
  ) : showBadge ? (
    <OnDeviceBadge size="sm" state={stream.isBusy ? 'thinking' : 'idle'} />
  ) : null

  const key = renderAccept ? (
    renderAccept(slot)
  ) : (
    <Button
      variant="solid"
      size={z.key}
      title={labels.accept}
      iconRight={icons.accept === null ? undefined : (icons.accept ?? ArrowRightToLine)}
      disabled={!ghost}
      onPress={accept}
      accessibilityLabel={ghost ? `${labels.accept}: ${ghost.trim()}` : labels.accept}
      testID={testID ? `${testID}-accept` : undefined}
    />
  )

  return (
    <Surface
      elevation="floating"
      radius={radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)}
      style={[{ padding: wells ? 7 : 0, gap: wells ? 2 : 0 }, style, styles.container]}
      testID={testID}
    >
      {wells ? <SkinWell radius={Math.max(8, (radius ?? s.radius.container) - 7)}>{field}</SkinWell> : field}
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: z.gap, minHeight: 44, paddingLeft: wells ? 6 : z.padX, paddingRight: wells ? 0 : z.padX - 4, paddingTop: wells ? 6 : 0, paddingBottom: wells ? 0 : z.padY - 2 }, styles.footer]}>
        {/* Lined up with the key's face, not with its pop side. */}
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingBottom: renderAccept ? 0 : s.depth[z.key] + (s.depth[z.key] ? 3 : 0) }}>{hint}</View>
        {key}
      </View>
    </Surface>
  )
}

export default InlineSuggest
