import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { CornerDownRight, RefreshCw } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Skeleton } from '../skeleton/skeleton'
import { replyTones, type ReplyTone } from './prompts'
import { useSmartReply, type ThreadMessage, type UseSmartReplyOptions } from './use-smart-reply'

export interface SmartReplyProps extends UseSmartReplyOptions {
  /** The conversation (last message is replied to) or just the last message. */
  thread: ThreadMessage[] | string
  onSelect: (text: string) => void
  presentation?: 'chips' | 'stack' | 'ghost'
  /** Show a tone picker. */
  showTone?: boolean
  autoRun?: boolean
  showBadge?: boolean
  /** Ghost presentation: current input value and change handler. */
  value?: string
  onChangeText?: (text: string) => void
  placeholder?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Three reply suggestions as chips, a stack, or ghost text inside the input. */
export function SmartReply({ thread, onSelect, presentation = 'chips', showTone = false, autoRun = true, showBadge = true, value = '', onChangeText, placeholder = 'Reply…', style, testID, ...hookOptions }: SmartReplyProps) {
  const t = useTheme()
  const motion = useMotion()
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
  const toneRow = showTone ? (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {replyTones.map((x) => (
        <Chip key={x.id} label={x.label} size="sm" variant="ghost" selected={tone === x.id} onPress={() => setTone(x.id)} />
      ))}
    </View>
  ) : null
  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {showBadge ? <OnDeviceBadge size="sm" state={sr.status} provider={sr.provider} locality={sr.locality as never} /> : <View />}
      {!sr.isBusy ? (
        <Pressable accessibilityRole="button" accessibilityLabel="More suggestions" hitSlop={8} onPress={() => void sr.run(thread, tone).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 }}>
          <RefreshCw size={12} strokeWidth={1.5} color={t.colors.textTertiary} />
          <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>more</Text>
        </Pressable>
      ) : null}
    </View>
  )
  const errorView = sr.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{sr.error.message}</Text> : null

  if (presentation === 'ghost') {
    const suggestion = sr.replies[0] ?? ''
    const ghost = !value && suggestion
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        {toneRow}
        <View style={{ minHeight: 48, borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.input, paddingHorizontal: 14, justifyContent: 'center' }}>
          {ghost ? (
            <Text pointerEvents="none" style={[typeStyle(t, 'md'), { position: 'absolute', left: 14, right: 48, color: t.colors.textTertiary }]} numberOfLines={1}>
              {suggestion}
            </Text>
          ) : null}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={ghost ? '' : placeholder}
            placeholderTextColor={t.colors.textTertiary}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Tab' && ghost) {
                e.preventDefault?.()
                pick(suggestion)
              }
            }}
            style={[typeStyle(t, 'md'), { color: t.colors.text, paddingVertical: 12, paddingRight: 40, outlineStyle: 'none' } as never]}
          />
          {ghost ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Accept suggestion" onPress={() => pick(suggestion)} hitSlop={8} style={{ position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.accent.soft, alignItems: 'center', justifyContent: 'center' }}>
              <CornerDownRight size={14} strokeWidth={1.75} color={t.colors.accent.solid} />
            </Pressable>
          ) : null}
        </View>
        {errorView}
        {footer}
      </View>
    )
  }
  if (presentation === 'stack') {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        {toneRow}
        {sr.isBusy && !sr.replies.length ? <Skeleton lines={3} height={36} radius="md" /> : null}
        {errorView}
        {sr.replies.map((r, i) => (
          <Animated.View key={`${r}-${i}`} entering={motion.enabled ? FadeInDown.delay(i * 60).duration(200) : undefined}>
            <Pressable onPress={() => pick(r)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: t.radii.md, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: pressed ? t.colors.elevatedHover : t.colors.surface })}>
              <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>{r}</Text>
            </Pressable>
          </Animated.View>
        ))}
        {footer}
      </View>
    )
  }
  return (
    <View style={[{ gap: 8 }, style]} testID={testID}>
      {toneRow}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {sr.isBusy && !sr.replies.length ? (
          <>
            <Skeleton width={120} height={34} radius="pill" />
            <Skeleton width={160} height={34} radius="pill" />
            <Skeleton width={100} height={34} radius="pill" />
          </>
        ) : null}
        {sr.replies.map((r, i) => (
          <Animated.View key={`${r}-${i}`} entering={motion.enabled ? FadeInRight.delay(i * 60).duration(200) : undefined}>
            <Chip label={r} variant="soft" onPress={() => pick(r)} />
          </Animated.View>
        ))}
      </ScrollView>
      {errorView}
      {footer}
    </View>
  )
}

export default SmartReply
