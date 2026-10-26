import { useEffect, useRef } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Plus, Sparkles } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Skeleton } from '../skeleton/skeleton'
import { useAutoTag, type UseAutoTagOptions } from './use-auto-tag'

export interface AutoTagProps extends UseAutoTagOptions {
  /** The content to tag. */
  text: string
  selected: string[]
  onChange: (tags: string[]) => void
  presentation?: 'chips' | 'inlineGhost' | 'dropdown'
  multi?: boolean
  autoRun?: boolean
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Tag suggestions from the app's own list: chips, faded inline ghosts, or a dropdown. Multi-select with a max. */
export function AutoTag({ text, selected, onChange, presentation = 'chips', multi = true, autoRun = true, showBadge = true, style, testID, ...hookOptions }: AutoTagProps) {
  const t = useTheme()
  const motion = useMotion()
  const at = useAutoTag(hookOptions)
  const last = useRef('')
  useEffect(() => {
    if (!autoRun || !text.trim() || last.current === text) return
    const h = setTimeout(() => {
      last.current = text
      void at.run(text).catch(() => {})
    }, 350)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoRun])

  const toggle = (tag: string) => {
    void Haptics.selectionAsync().catch(() => {})
    if (selected.includes(tag)) onChange(selected.filter((x) => x !== tag))
    else onChange(multi ? [...selected, tag] : [tag])
  }
  const pending = at.suggestions.filter((s) => !selected.includes(s))
  const badge = showBadge ? <OnDeviceBadge size="sm" state={at.status} provider={at.provider} locality={at.locality as never} /> : null

  if (presentation === 'inlineGhost') {
    return (
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, style]} testID={testID}>
        {selected.map((s) => (
          <Chip key={s} label={s} size="sm" variant="solid" onRemove={() => toggle(s)} />
        ))}
        {at.isBusy && !pending.length ? <Skeleton width={72} height={28} radius="pill" /> : null}
        {pending.map((s, i) => (
          <Animated.View key={s} entering={motion.enabled ? FadeInRight.delay(i * 50).duration(180) : undefined}>
            <Chip label={s} size="sm" variant="outline" ghost icon={<Plus size={12} strokeWidth={1.75} color={t.colors.textTertiary} />} onPress={() => toggle(s)} accessibilityLabel={`Add tag ${s}`} />
          </Animated.View>
        ))}
        {at.error ? <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{at.error.message}</Text> : null}
      </View>
    )
  }
  if (presentation === 'dropdown') {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {selected.map((s) => (
            <Chip key={s} label={s} size="sm" variant="solid" onRemove={() => toggle(s)} />
          ))}
        </View>
        {(pending.length || at.isBusy || at.error) ? (
          <View style={{ borderRadius: t.radii.md, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.elevated, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: hairlineWidth, borderBottomColor: t.colors.hairline }}>
              <Sparkles size={12} strokeWidth={1.5} color={t.colors.accent.solid} />
              <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>Suggested</Text>
            </View>
            {at.isBusy && !pending.length ? <View style={{ padding: 12 }}><Skeleton lines={2} height={12} /></View> : null}
            {at.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, padding: 12 }]}>{at.error.message}</Text> : null}
            {pending.map((s) => (
              <Pressable key={s} onPress={() => toggle(s)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: pressed ? t.colors.elevatedHover : 'transparent' })}>
                <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {badge}
      </View>
    )
  }
  return (
    <View style={[{ gap: 10 }, style]} testID={testID}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {at.isBusy && !at.suggestions.length ? (
          <>
            <Skeleton width={80} height={34} radius="pill" />
            <Skeleton width={110} height={34} radius="pill" />
          </>
        ) : null}
        {[...selected, ...pending].map((s, i) => (
          <Animated.View key={s} entering={motion.enabled ? FadeInRight.delay(i * 40).duration(180) : undefined}>
            <Chip label={s} variant="soft" selected={selected.includes(s)} ghost={!selected.includes(s)} onPress={() => toggle(s)} />
          </Animated.View>
        ))}
      </View>
      {at.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{at.error.message}</Text> : null}
      {badge}
    </View>
  )
}

export default AutoTag
