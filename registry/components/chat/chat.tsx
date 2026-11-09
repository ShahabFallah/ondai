import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { ArrowUpRight, MessageSquare } from 'lucide-react-native'
import { useChat, type ChatMessage, type UseChatOptions } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { AssistantMessage, assistantMessageLabels, UserMessage, type AssistantMessageIcons, type AssistantMessageLabels } from '../assistant-message/assistant-message'
import { PromptComposer, promptComposerLabels, type PromptComposerIcons, type PromptComposerLabels, type PromptComposerProps } from '../prompt-composer/prompt-composer'
import { SkinRowFace, SkinTile, skinHasWells, Surface } from '../surface/surface'

/** Every icon Chat draws: the composer's, the replies' and the suggestions'. `null` hides one. */
export interface ChatIcons extends PromptComposerIcons, AssistantMessageIcons {
  /** Leading mark on a suggestion row. */
  suggestion: IconInput
  /** Trailing arrow on a suggestion row. */
  suggestionGo: IconInput
}

/** Every string Chat shows or announces: the composer's, the replies' and the empty state's. */
export interface ChatLabels extends PromptComposerLabels, AssistantMessageLabels {
  emptyTitle: string
  /** One line under the title while the conversation is empty. */
  emptyHint: string
}

/** Styles for each part, applied after the component's own. */
export interface ChatStyles {
  container: StyleProp<ViewStyle>
  /** The scrolling list of turns. */
  list: StyleProp<ViewStyle>
  empty: StyleProp<ViewStyle>
  emptyTitle: StyleProp<TextStyle>
  suggestions: StyleProp<ViewStyle>
  suggestion: StyleProp<ViewStyle>
  /** The person's bubbles. */
  bubble: StyleProp<ViewStyle>
  /** The model's replies. */
  reply: StyleProp<ViewStyle>
  composer: StyleProp<ViewStyle>
}

export const chatLabels: ChatLabels = {
  ...promptComposerLabels,
  ...assistantMessageLabels,
  emptyTitle: 'What can I help with?',
  emptyHint: 'Runs on this phone. Nothing you type leaves it.',
}

export interface ChatEmptyProps {
  suggestions: string[]
  send: (text: string) => void
}

export interface ChatProps extends UseChatOptions {
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Reaches the
   * bubbles, the replies, the suggestions and the composer together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the bubbles, the send key and the glow. Defaults to the theme accent. */
  tint?: string
  /** Corner radius of the composer, the reply cards and the bubbles. Defaults to the variant's. */
  radius?: number
  /** `plain` replies sit on the page like a document; `card` puts each on a panel. */
  replies?: 'plain' | 'card'
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  /** Shortcut for `labels.emptyTitle`. */
  emptyTitle?: string
  /** Shown while the conversation is empty; tapping one sends it. */
  suggestions?: string[]
  /** Sent once on mount (a deep link, a "Ask about this" entry point). */
  initialPrompt?: string
  icons?: Partial<ChatIcons>
  labels?: Partial<ChatLabels>
  styles?: Partial<ChatStyles>
  /** The model badge in the composer. */
  showBadge?: boolean
  /** Extra props for the composer (attachments, an accessory, `renderSend`). */
  composerProps?: Partial<Omit<PromptComposerProps, 'onSubmit' | 'busy' | 'onStop'>>
  /** Draw one turn yourself. Return undefined to keep the default for that turn. */
  renderMessage?: (message: ChatMessage, index: number) => ReactNode
  /** Draw the empty conversation yourself. */
  renderEmpty?: (props: ChatEmptyProps) => ReactNode
  /** Draw one suggestion yourself. */
  renderSuggestion?: (text: string, send: () => void) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<ChatProps['size']>
const sizes: Record<Size, { title: FontSizeKey; body: FontSizeKey; hint: FontSizeKey; row: number; tile: number; icon: number; gap: number }> = {
  sm: { title: 'lg', body: 'sm', hint: 'xs', row: 40, tile: 24, icon: 13, gap: 16 },
  md: { title: 'xl', body: 'md', hint: 'sm', row: 46, tile: 28, icon: 15, gap: 20 },
  lg: { title: '2xl', body: 'lg', hint: 'md', row: 54, tile: 32, icon: 17, gap: 24 },
}

/**
 * A complete on-device conversation: turns stream in with their trace, the composer stops a reply mid-way,
 * and the history is trimmed to fit the model's context. Built from PromptComposer and AssistantMessage,
 * and `variant` reaches every part.
 */
export function Chat({ variant, tint, ...props }: ChatProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <ChatInner {...props} />
    </SkinProvider>
  )
}

function ChatInner({
  size = 'md',
  radius,
  replies = 'plain',
  placeholder,
  emptyTitle,
  suggestions = [],
  initialPrompt,
  icons = {},
  labels: labelsProp,
  styles = {},
  showBadge = true,
  composerProps,
  renderMessage,
  renderEmpty,
  renderSuggestion,
  style,
  testID,
  ...options
}: Omit<ChatProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const z = sizes[size]
  const labels: ChatLabels = { ...chatLabels, ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null), ...(emptyTitle !== undefined ? { emptyTitle } : null) }
  const chat = useChat(options)
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)
  const last = chat.messages[chat.messages.length - 1]
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: false })
  }, [chat.messages.length, last?.text])

  const send = (text: string) => void chat.send(text).catch(() => {})
  const sentInitial = useRef(false)
  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true
      send(initialPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt])
  const empty = chat.messages.length === 0
  const wells = skinHasWells(s.skin)

  const suggestionRow = (text: string, i: number) => {
    if (renderSuggestion) return <View key={text}>{renderSuggestion(text, () => send(text))}</View>
    const r = Math.max(8, s.radius.control)
    const lead = renderIcon(icons.suggestion, MessageSquare, { size: z.icon, strokeWidth: 1.75, color: wells ? s.tile.ink : t.colors.textSecondary })
    return (
      <Pressable key={text} onPress={() => send(text)} accessibilityRole="button" accessibilityLabel={text} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row, paddingHorizontal: 8, paddingVertical: 6, borderRadius: r, borderTopWidth: i && !wells ? hairlineWidth : 0, borderTopColor: t.colors.hairline }, styles.suggestion]}>
        {(st) => (
          <>
            {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
            {lead === null ? null : wells ? (
              <SkinTile size={z.tile}>{lead}</SkinTile>
            ) : (
              <View style={{ width: z.tile, height: z.tile, borderRadius: Math.round(z.tile * 0.32), alignItems: 'center', justifyContent: 'center', backgroundColor: s.skin === 'minimal' ? 'transparent' : t.colors.muted, borderWidth: s.skin === 'minimal' ? hairlineWidth : 0, borderColor: t.colors.hairlineStrong }}>{lead}</View>
            )}
            <Text numberOfLines={1} style={[typeStyle(t, z.body, { weight: 'medium' }), { color: t.colors.text, flex: 1 }]}>
              {text}
            </Text>
            {renderIcon(icons.suggestionGo, ArrowUpRight, { size: z.icon, strokeWidth: 1.75, color: t.colors.textTertiary })}
          </>
        )}
      </Pressable>
    )
  }

  const emptyState = renderEmpty ? (
    renderEmpty({ suggestions, send })
  ) : (
    <View style={[{ gap: 14 }, styles.empty]}>
      <View style={{ gap: 4, paddingHorizontal: 2 }}>
        <Text style={[typeStyle(t, z.title, { weight: 'semibold' }), { color: t.colors.text }, styles.emptyTitle]}>{labels.emptyTitle}</Text>
        {labels.emptyHint ? <Text style={[typeStyle(t, z.hint), { color: t.colors.textSecondary }]}>{labels.emptyHint}</Text> : null}
      </View>
      {suggestions.length ? (
        <Surface elevation="card" radius={radius ?? (s.skin === 'clean' ? t.radii.lg + 2 : s.radius.container - 4)} style={[{ padding: 6, gap: wells ? 4 : 0 }, styles.suggestions]}>
          {suggestions.map(suggestionRow)}
        </Surface>
      ) : null}
    </View>
  )

  return (
    <View style={[{ flex: 1, gap: 12 }, style, styles.container]} testID={testID}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[{ gap: z.gap, paddingVertical: 8, paddingHorizontal: 2, flexGrow: 1, justifyContent: empty ? 'flex-end' : 'flex-start' }, styles.list]} keyboardShouldPersistTaps="handled">
        {empty
          ? emptyState
          : chat.messages.map((m, i) => {
              const custom = renderMessage?.(m, i)
              if (custom !== undefined) return <View key={m.id}>{custom}</View>
              return m.role === 'user' ? (
                <UserMessage key={m.id} text={m.text} size={size} radius={radius !== undefined ? Math.max(radius, 12) : undefined} style={styles.bubble} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  text={m.text}
                  status={m.status}
                  thoughtMs={m.thoughtMs}
                  error={m.error && m.status === 'error' ? m.error.message : undefined}
                  presentation={replies}
                  size={size}
                  radius={radius}
                  icons={icons}
                  labels={labels}
                  style={styles.reply}
                  onRetry={i === chat.messages.length - 1 ? () => void chat.retry().catch(() => {}) : undefined}
                />
              )
            })}
      </ScrollView>
      <PromptComposer
        size={size}
        radius={radius}
        icons={icons}
        labels={labels}
        showBadge={showBadge}
        {...composerProps}
        onSubmit={send}
        busy={chat.isBusy}
        onStop={chat.stop}
        status={chat.status}
        style={[composerProps?.style, styles.composer]}
      />
    </View>
  )
}

export default Chat
