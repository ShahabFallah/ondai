import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowRight, ChevronRight, CornerDownLeft, Mic, Search, Sparkles } from 'lucide-react-native'
import { errorMessages } from '@ondai/core'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { IonBorder } from '../ion-border/ion-border'
import { KeyHint } from '../key-hint/key-hint'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { StreamingText } from '../streaming-text/streaming-text'
import { ThinkingIndicator } from '../thinking-indicator/thinking-indicator'
import { ToolConfirmCard } from '../tool-confirm-card/tool-confirm-card'
import type { CommandAction } from './actions'
import { registerToolNames, useCommandBar, type CommandResult, type UseCommandBarOptions } from './use-command-bar'

export interface CommandBarProps extends UseCommandBarOptions {
  presentation?: 'spotlight' | 'sheet' | 'inline' | 'pill' | 'fullscreen'
  variant?: 'glass' | 'solid' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  showVoice?: boolean
  showKeyHints?: boolean
  showBadge?: boolean
  /** Recently run action ids shown when the query is empty. */
  recent?: string[]
  /** Group suggestions by `actions` / `screens` / `items`. */
  grouped?: boolean
  /** Called when the mic is pressed; return transcribed text. */
  onVoice?: () => Promise<string>
  /** Pre-filled query (playground / deep links). */
  initialQuery?: string
  /** Submit the initial query on mount. */
  autoRun?: boolean
  /** Render inside the current view instead of a Modal (web previews). */
  inline?: boolean
  renderIcon?: (action: CommandAction<any>) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * "Spotlight for your app": natural language becomes one of the app's registered actions,
 * chosen by on-device tool calling, with a preview and confirmation for risky actions.
 */
export function CommandBar({
  presentation = 'spotlight',
  variant = 'glass',
  size = 'md',
  open: openProp,
  onOpenChange,
  placeholder = 'Ask or do anything…',
  showVoice = true,
  showKeyHints = Platform.OS === 'web',
  showBadge = true,
  recent,
  grouped = true,
  onVoice,
  initialQuery = '',
  autoRun = false,
  inline,
  renderIcon,
  style,
  testID,
  ...hookOptions
}: CommandBarProps) {
  const t = useTheme()
  const motion = useMotion()
  const bar = useCommandBar(hookOptions)
  const [openState, setOpenState] = useState(openProp ?? (presentation === 'inline' || presentation === 'pill'))
  const open = openProp ?? openState
  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  const busy = bar.status === 'thinking' || bar.status === 'streaming' || bar.status === 'tool'

  useEffect(() => registerToolNames(hookOptions.actions), [hookOptions.actions])
  useEffect(() => {
    if (initialQuery) bar.setQuery(initialQuery)
    if (autoRun && initialQuery) void bar.submit(initialQuery).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, autoRun])
  useEffect(() => {
    if (open && presentation !== 'pill') setTimeout(() => inputRef.current?.focus(), 60)
  }, [open, presentation])
  useEffect(() => {
    if (bar.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [bar.status])

  const submit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    void bar.submit().catch(() => {})
  }
  const pick = (a: CommandAction<any>) => {
    void Haptics.selectionAsync().catch(() => {})
    void bar.runAction(a, {}).catch(() => {})
  }

  const groups = useMemo(() => {
    const list = bar.query.trim() ? bar.suggestions : recent?.length ? recent.map((id) => hookOptions.actions.find((a) => a.id === id)).filter((a): a is CommandAction<any> => !!a) : bar.suggestions
    if (!grouped) return [{ key: 'all', title: bar.query.trim() ? 'Suggestions' : recent?.length ? 'Recent' : 'Suggestions', items: list }]
    const order: Array<CommandAction<any>['group']> = ['actions', 'screens', 'items']
    return order.map((g) => ({ key: g!, title: g!, items: list.filter((a) => (a.group ?? 'actions') === g) })).filter((g) => g.items.length)
  }, [bar.query, bar.suggestions, recent, hookOptions.actions, grouped])

  const surfaceColor = variant === 'solid' ? t.colors.surface : variant === 'minimal' ? 'transparent' : t.colors.glassFill
  const inputHeight = size === 'sm' ? 44 : size === 'md' ? 52 : 60
  const sizeKey = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl'

  const field = (
    <IonBorder active={busy} focused={open} radius="lg" fill={surfaceColor} glow={busy && variant !== 'minimal'} width={1.5}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: inputHeight, paddingLeft: 14, paddingRight: 8, gap: 10 }}>
        {busy ? <ThinkingIndicator variant="dots" size="sm" /> : <Search size={18} strokeWidth={1.5} color={t.colors.textTertiary} />}
        <TextInput
          ref={inputRef}
          testID={testID ? `${testID}-input` : undefined}
          value={bar.query}
          onChangeText={bar.setQuery}
          onSubmitEditing={submit}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Escape') setOpen(false)
          }}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textTertiary}
          selectionColor={t.colors.accent.solid}
          returnKeyType="go"
          autoCorrect={false}
          accessibilityLabel="Command input"
          style={[typeStyle(t, sizeKey), { flex: 1, color: t.colors.text, paddingVertical: 0, outlineStyle: 'none' } as never]}
        />
        {showVoice && onVoice ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Speak"
            onPress={() => void onVoice().then((text) => (text ? bar.submit(text) : null)).catch(() => {})}
            hitSlop={8}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Mic size={18} strokeWidth={1.5} color={t.colors.textSecondary} />
          </Pressable>
        ) : null}
        {showKeyHints ? <KeyHint keys={bar.query ? ['enter'] : ['cmd', 'K']} size="sm" /> : null}
      </View>
    </IonBorder>
  )

  const rows = (
    <View style={{ gap: 4, paddingTop: 8 }}>
      {bar.error ? (
        <Animated.View entering={motion.enabled ? FadeIn.duration(160) : undefined} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: t.radii.md, borderWidth: hairlineWidth, borderColor: t.colors.danger, gap: 6 }}>
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>{bar.error.message || errorMessages.unknown}</Text>
          <Pressable onPress={submit} accessibilityRole="button" style={{ minHeight: 28, justifyContent: 'center' }}>
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Try again</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      {bar.pendingConfirmation ? <ToolConfirmCard pending={bar.pendingConfirmation} presentation="banner" /> : null}
      {bar.result ? <ResultRow result={bar.result} /> : null}
      {bar.text && !bar.result ? <StreamingText text={bar.text} streaming={bar.status === 'streaming'} size="sm" color={t.colors.textSecondary} /> : null}
      {!bar.result && !bar.pendingConfirmation
        ? groups.map((g) => (
            <View key={g.key} style={{ gap: 2 }}>
              <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary, paddingHorizontal: 12, paddingVertical: 6 }]}>{g.title}</Text>
              {g.items.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => pick(a)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: t.radii.md, backgroundColor: pressed ? t.colors.elevatedHover : 'transparent' })}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: t.colors.input, alignItems: 'center', justifyContent: 'center' }}>
                    {renderIcon?.(a) ?? <Sparkles size={14} strokeWidth={1.5} color={t.colors.textSecondary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]} numberOfLines={1}>
                      {a.title}
                    </Text>
                    {a.description ? (
                      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]} numberOfLines={1}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} strokeWidth={1.5} color={t.colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          ))
        : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
        {showBadge ? <OnDeviceBadge size="sm" state={bar.status} provider={bar.provider} locality={bar.locality as never} /> : <View />}
        {showKeyHints ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <KeyHint keys={['enter']} size="sm" variant="plain" />
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>run</Text>
            <KeyHint keys={['esc']} size="sm" variant="plain" />
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>close</Text>
          </View>
        ) : null}
      </View>
    </View>
  )

  const panel = (
    <View style={{ padding: 10, gap: 4 }}>
      {field}
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
        {rows}
      </ScrollView>
    </View>
  )

  if (presentation === 'inline') {
    return (
      <View style={[{ gap: 4 }, style]} testID={testID}>
        {field}
        {(bar.query || bar.result || bar.pendingConfirmation || bar.error) ? rows : null}
      </View>
    )
  }
  if (presentation === 'pill') {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        {open ? (
          <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined} style={{ borderRadius: t.radii.xl, backgroundColor: surfaceColor, borderWidth: hairlineWidth, borderColor: t.colors.hairline }}>
            {panel}
          </Animated.View>
        ) : null}
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close command bar' : 'Open command bar'}
          style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 18, borderRadius: t.radii.pill, backgroundColor: t.colors.text }}
        >
          <Sparkles size={16} strokeWidth={1.5} color={t.colors.bg} />
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.bg }]}>{open ? 'Close' : 'Ask'}</Text>
        </Pressable>
      </View>
    )
  }
  return (
    <Sheet open={open} onClose={() => setOpen(false)} presentation={presentation === 'sheet' ? 'sheet' : presentation === 'fullscreen' ? 'fullscreen' : 'spotlight'} variant={variant === 'solid' ? 'solid' : 'glass'} inline={inline} style={style} testID={testID}>
      {panel}
    </Sheet>
  )
}

function ResultRow({ result }: { result: CommandResult }) {
  const t = useTheme()
  const motion = useMotion()
  const text = result.preview ?? (typeof result.result === 'string' ? result.result : result.action.title)
  return (
    <Animated.View entering={motion.enabled ? FadeInDown.duration(220) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: t.radii.md, backgroundColor: t.colors.accent.soft }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: t.colors.accent.solid, alignItems: 'center', justifyContent: 'center' }}>
        <ArrowRight size={14} strokeWidth={2} color={t.colors.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]} numberOfLines={1}>
          {result.action.title}
        </Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <CornerDownLeft size={14} strokeWidth={1.5} color={t.colors.textTertiary} />
    </Animated.View>
  )
}

export default CommandBar
