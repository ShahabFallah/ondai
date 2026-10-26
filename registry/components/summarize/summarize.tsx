import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ChevronDown, RefreshCw, Sparkles } from 'lucide-react-native'
import { availabilityCopy, useLocalModel } from '@ondai/core'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { IonBorder } from '../ion-border/ion-border'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import type { SummaryLength } from './prompts'
import { useSummarize, type UseSummarizeOptions } from './use-summarize'

export interface SummarizeProps extends UseSummarizeOptions {
  /** The text to summarize. */
  text: string
  presentation?: 'card' | 'inline' | 'sheet' | 'tooltip'
  length?: SummaryLength
  /** Visual style of the summary body. */
  style?: 'plain' | 'quote' | 'highlighted'
  title?: string
  /** Run on mount / when `text` changes. */
  autoRun?: boolean
  /** Card starts collapsed (summary hidden until tapped). */
  collapsed?: boolean
  showBadge?: boolean
  /** Children are the content the summary refers to (tooltip anchors above them). */
  children?: ReactNode
  containerStyle?: StyleProp<ViewStyle>
  testID?: string
}

/** A TL;DR for long text. Card, inline link, sheet or tooltip. Streams, and map-reduces long input. */
export function Summarize({ text, presentation = 'card', length = 'bullets', style = 'plain', title = 'TL;DR', autoRun = true, collapsed = false, showBadge = true, children, containerStyle, testID, ...hookOptions }: SummarizeProps) {
  const t = useTheme()
  const motion = useMotion()
  const s = useSummarize({ ...hookOptions, length })
  const model = useLocalModel('text')
  const [open, setOpen] = useState(!collapsed)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ran = useRef<string | null>(null)

  useEffect(() => {
    if (!autoRun || !text.trim() || ran.current === text || !model.isReady) return
    ran.current = text
    void s.run(text).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoRun, model.isReady, length])
  useEffect(() => {
    if (s.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [s.status])

  const unavailable = model.availability && model.availability.status !== 'ready'
  const busy = s.isBusy
  const retry = () => void s.run(text).catch(() => {})

  const body = (
    <View style={{ gap: 10 }}>
      {unavailable && model.availability ? (
        model.availability.status === 'preparing' ? (
          <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label="Preparing model" />
        ) : (
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(model.availability).title}</Text>
        )
      ) : s.status === 'thinking' ? (
        <View style={{ gap: 8 }}>
          <Skeleton lines={length === 'oneLine' ? 1 : 3} height={12} />
          {s.progress ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`reading part ${s.progress[0]} of ${s.progress[1]}`}</Text> : null}
        </View>
      ) : s.error ? (
        <Animated.View entering={motion.enabled ? FadeIn.duration(160) : undefined} style={{ gap: 8 }}>
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>{s.error.message}</Text>
          {s.error.kind !== 'refusal' ? <Button title="Try again" variant="soft" size="sm" onPress={retry} icon={<RefreshCw size={14} strokeWidth={1.5} color={t.colors.text} />} /> : null}
        </Animated.View>
      ) : (
        <View style={[style === 'quote' && { borderLeftWidth: 2, borderLeftColor: t.colors.accent.solid, paddingLeft: 12 }, style === 'highlighted' && { backgroundColor: t.colors.accent.soft, borderRadius: t.radii.md, padding: 12 }]}>
          <StreamingText text={s.summary} streaming={s.status === 'streaming'} size="md" color={t.colors.text} placeholder={autoRun ? '' : 'Tap Summarize to generate a TL;DR on device.'} />
        </View>
      )}
      {(showBadge || s.status === 'done') && !unavailable ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {showBadge ? <OnDeviceBadge size="sm" state={s.status} provider={s.provider} locality={s.locality as never} /> : <View />}
          {!autoRun && !busy && !s.summary ? <Button title="Summarize" size="sm" variant="solid" onPress={retry} icon={<Sparkles size={14} strokeWidth={1.5} color={t.colors.bg} />} /> : null}
        </View>
      ) : null}
    </View>
  )

  if (presentation === 'inline') {
    return (
      <View style={[{ gap: 8 }, containerStyle]} testID={testID}>
        {children}
        {!expanded ? (
          <Pressable
            onPress={() => {
              setExpanded(true)
              if (!s.summary && !busy) retry()
            }}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}
          >
            <Sparkles size={14} strokeWidth={1.5} color={t.colors.accent.solid} />
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>Summarize</Text>
          </Pressable>
        ) : (
          <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
            <IonBorder active={busy} radius="md">
              <View style={{ padding: 12 }}>{body}</View>
            </IonBorder>
          </Animated.View>
        )}
      </View>
    )
  }
  if (presentation === 'sheet') {
    return (
      <View style={containerStyle} testID={testID}>
        {children}
        <Button
          title="Summarize"
          variant="soft"
          size="sm"
          icon={<Sparkles size={14} strokeWidth={1.5} color={t.colors.text} />}
          onPress={() => {
            setSheetOpen(true)
            if (!s.summary && !busy) retry()
          }}
        />
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} presentation="sheet" variant="solid" inline>
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={[typeStyle(t, 'lg', { weight: 'medium' }), { color: t.colors.text }]}>{title}</Text>
            {body}
          </View>
        </Sheet>
      </View>
    )
  }
  if (presentation === 'tooltip') {
    return (
      <View style={[{ gap: 8 }, containerStyle]} testID={testID}>
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
          <IonBorder active={busy} radius="md" fill={t.colors.elevated} glow>
            <View style={{ padding: 12, maxWidth: 320 }}>{body}</View>
          </IonBorder>
          <View style={{ alignSelf: 'flex-start', marginLeft: 20, width: 10, height: 10, backgroundColor: t.colors.elevated, transform: [{ rotate: '45deg' }], marginTop: -5, borderRightWidth: hairlineWidth, borderBottomWidth: hairlineWidth, borderColor: t.colors.hairline }} />
        </Animated.View>
        {children}
      </View>
    )
  }
  return (
    <View style={containerStyle} testID={testID}>
      <IonBorder active={busy} radius="lg" glow={busy}>
        <View style={{ padding: 14, gap: 10 }}>
          <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
            <Sparkles size={14} strokeWidth={1.5} color={busy ? t.colors.accent.solid : t.colors.textSecondary} />
            <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textSecondary, flex: 1 }]}>{title}</Text>
            {s.inputTokens ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`≈${s.inputTokens} tok`}</Text> : null}
            <ChevronDown size={14} strokeWidth={1.5} color={t.colors.textTertiary} style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }} />
          </Pressable>
          {open ? body : null}
        </View>
      </IonBorder>
      {children}
    </View>
  )
}

export default Summarize
