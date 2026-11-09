import { useRef, useState, type ComponentRef, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, Text, TextInput, View, type StyleProp, type TextInputKeyPressEvent, type TextStyle, type ViewStyle } from 'react-native'
import { ArrowUp, FileText, Image as ImageIcon, Plus, Square, X } from 'lucide-react-native'
import type { AiState, FontSizeKey, SkinInput } from '@ondai/tokens'
import { renderIcon, SkinProvider, typeStyle, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Surface } from '../surface/surface'

export interface ComposerAttachment {
  id: string
  name: string
  kind?: 'image' | 'file'
}

/** Every icon the composer draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface PromptComposerIcons {
  attach: IconInput
  send: IconInput
  stop: IconInput
  /** Attachment chips. */
  image: IconInput
  file: IconInput
  remove: IconInput
}

/** Every string the composer shows or announces. */
export interface PromptComposerLabels {
  placeholder: string
  /** Screen reader names for the keys. */
  send: string
  stop: string
  attach: string
  /** Prefix for an attachment's remove button: "Remove Receipt.jpg". */
  remove: string
}

export interface PromptComposerStyles {
  container: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  attachments: StyleProp<ViewStyle>
  attachment: StyleProp<ViewStyle>
  toolbar: StyleProp<ViewStyle>
}

export const promptComposerLabels: PromptComposerLabels = { placeholder: 'Ask anything', send: 'Send', stop: 'Stop', attach: 'Add a photo or file', remove: 'Remove' }

export interface ComposerSendProps {
  canSend: boolean
  busy: boolean
  submit: () => void
  stop: () => void
}

export interface PromptComposerProps {
  /** Controlled text. Leave out to let the composer keep its own. */
  value?: string
  onChangeText?: (text: string) => void
  /** Called with the trimmed text; an uncontrolled composer clears itself. */
  onSubmit: (text: string) => void
  /** The model is answering: the send key becomes a stop key. */
  busy?: boolean
  onStop?: () => void
  /** Drives the badge dot. Defaults from `busy`. */
  status?: AiState
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the
   * container, the attachment chips and the send key together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the send key, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Container corner radius. Defaults to the variant's. */
  radius?: number
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  icons?: Partial<PromptComposerIcons>
  labels?: Partial<PromptComposerLabels>
  styles?: Partial<PromptComposerStyles>
  attachments?: ComposerAttachment[]
  /** Shows the add button. */
  onAttach?: () => void
  onRemoveAttachment?: (id: string) => void
  /** Draw an attachment yourself (a thumbnail, a progress ring). */
  renderAttachment?: (attachment: ComposerAttachment, remove?: () => void) => ReactNode
  /** Extra controls in the toolbar, after the add button (a model picker, a mode toggle). */
  accessory?: ReactNode
  /** Draw the send and stop key yourself. */
  renderSend?: (props: ComposerSendProps) => ReactNode
  /** The "On device · Apple" badge next to the add button. */
  showBadge?: boolean
  /** Lines before the field scrolls. */
  maxLines?: number
  autoFocus?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** The stop key's glyph: a small filled square in the key's own ink. */
function StopGlyph({ color }: IconProps) {
  return <Square size={12} strokeWidth={2.5} color={color} fill={color} />
}

type Size = NonNullable<PromptComposerProps['size']>
const sizes: Record<Size, { font: FontSizeKey; pad: number; gap: number; key: 'sm' | 'md' | 'lg'; icon: number; chip: number }> = {
  sm: { font: 'md', pad: 10, gap: 8, key: 'sm', icon: 15, chip: 26 },
  md: { font: 'lg', pad: 12, gap: 10, key: 'sm', icon: 16, chip: 30 },
  lg: { font: 'xl', pad: 16, gap: 12, key: 'md', icon: 18, chip: 34 },
}

/**
 * Where a person writes to the on-device model: a field that grows with the text, attachments above it,
 * the model badge and a send key below. While the model answers, the key stops it.
 * Enter sends on web and hardware keyboards; Shift+Enter adds a line.
 */
export function PromptComposer({ variant, tint, ...props }: PromptComposerProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Composer {...props} />
    </SkinProvider>
  )
}

function Composer({
  value,
  onChangeText,
  onSubmit,
  busy = false,
  onStop,
  status,
  size = 'md',
  radius,
  placeholder,
  icons = {},
  labels: labelsProp,
  styles = {},
  attachments = [],
  onAttach,
  onRemoveAttachment,
  renderAttachment,
  accessory,
  renderSend,
  showBadge = true,
  maxLines = 6,
  autoFocus,
  disabled,
  style,
  testID,
}: Omit<PromptComposerProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const z = sizes[size]
  const labels = { ...promptComposerLabels, ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  const [own, setOwn] = useState('')
  const text = value ?? own
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  const body = typeStyle(t, z.font)
  const line = body.lineHeight ?? 22
  const canSend = !disabled && !busy && text.trim().length > 0
  // The quiet looks keep the soft raised key; the expressive ones make send their primary key.
  const keyRole = s.skin === 'clean' || s.skin === 'minimal' ? 'raised' : 'solid'

  const change = (next: string) => {
    if (value === undefined) setOwn(next)
    onChangeText?.(next)
  }
  const submit = () => {
    if (!canSend) return
    onSubmit(text.trim())
    if (value === undefined) setOwn('')
  }
  const stop = () => onStop?.()
  const onKeyPress = (e: TextInputKeyPressEvent) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e.nativeEvent as { shiftKey?: boolean }).shiftKey) {
      e.preventDefault()
      submit()
    }
  }
  // An icon slot for a key: the override, else the default. Components are coloured by the key itself, so they follow the variant.
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

  const key = renderSend ? (
    renderSend({ canSend, busy, submit, stop })
  ) : busy ? (
    <Button variant={keyRole} size={z.key} icon={keyIcon(icons.stop, StopGlyph)} onPress={stop} accessibilityLabel={labels.stop} testID={testID ? `${testID}-stop` : undefined} />
  ) : (
    <Button variant={keyRole} size={z.key} disabled={!canSend} icon={keyIcon(icons.send, ArrowUp)} onPress={submit} accessibilityLabel={labels.send} testID={testID ? `${testID}-send` : undefined} />
  )

  return (
    <Surface
      elevation="floating"
      radius={radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)}
      style={[{ paddingHorizontal: z.pad, paddingTop: z.pad, paddingBottom: z.pad - 2, gap: z.gap, opacity: disabled ? 0.6 : 1 }, style, styles.container]}
      testID={testID}
    >
      {attachments.length ? (
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.attachments]}>
          {attachments.map((a) => {
            const remove = onRemoveAttachment ? () => onRemoveAttachment(a.id) : undefined
            if (renderAttachment) return <View key={a.id}>{renderAttachment(a, remove)}</View>
            return (
              <Surface key={a.id} elevation="inset" radius={Math.max(8, s.radius.inset - 2)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: z.chip, paddingLeft: 8, paddingRight: remove ? 4 : 10, maxWidth: 200 }, styles.attachment]}>
                {a.kind === 'image' ? renderIcon(icons.image, ImageIcon, { size: 14, strokeWidth: 1.75, color: t.colors.textSecondary }) : renderIcon(icons.file, FileText, { size: 14, strokeWidth: 1.75, color: t.colors.textSecondary })}
                <Text numberOfLines={1} style={[typeStyle(t, 'sm'), { color: t.colors.text, flexShrink: 1 }]}>
                  {a.name}
                </Text>
                {remove ? (
                  <Pressable onPress={remove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${labels.remove} ${a.name}`} style={({ pressed }) => ({ width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 6, opacity: pressed ? 0.5 : 1 })}>
                    {renderIcon(icons.remove, X, { size: 13, strokeWidth: 2, color: t.colors.textTertiary })}
                  </Pressable>
                ) : null}
              </Surface>
            )
          })}
        </View>
      ) : null}

      <TextInput
        ref={input}
        value={text}
        onChangeText={change}
        onKeyPress={onKeyPress}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        multiline
        autoFocus={autoFocus}
        editable={!disabled}
        accessibilityLabel={labels.placeholder}
        selectionColor={s.tint}
        style={[body, { color: t.colors.text, minHeight: line, maxHeight: line * maxLines, paddingHorizontal: 4, paddingVertical: 0, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null, styles.input]}
      />

      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, styles.toolbar]}>
        {onAttach && icons.attach !== null ? <Button variant="ghost" size={z.key} icon={icons.attach ?? Plus} onPress={onAttach} accessibilityLabel={labels.attach} /> : null}
        {accessory}
        {showBadge ? <OnDeviceBadge size="sm" state={status ?? (busy ? 'thinking' : 'idle')} /> : null}
        <View style={{ flex: 1 }} />
        {key}
      </View>
    </Surface>
  )
}

export default PromptComposer
