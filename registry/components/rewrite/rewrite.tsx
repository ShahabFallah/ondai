import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Check, Minimize2, Maximize2, Smile, Briefcase, SpellCheck, Wand2, X } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { IonBorder } from '../ion-border/ion-border'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { StreamingText } from '../streaming-text/streaming-text'
import { wordDiff } from './diff'
import { rewriteModes, type RewriteMode } from './prompts'
import { useRewrite, type UseRewriteOptions } from './use-rewrite'

export interface RewriteProps extends UseRewriteOptions {
  /** The text to rewrite (usually the current input value). */
  value: string
  /** Called when the user accepts a rewrite. */
  onAccept: (text: string) => void
  presentation?: 'toolbar' | 'menu' | 'chips'
  resultView?: 'replace' | 'diff' | 'sideBySide'
  modes?: RewriteMode[]
  /** Run this mode on mount (playground / shortcuts). */
  initialMode?: RewriteMode
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

const icons: Record<RewriteMode, typeof Wand2> = { shorten: Minimize2, expand: Maximize2, friendlier: Smile, formal: Briefcase, fix: SpellCheck, custom: Wand2 }

/** Shorten, expand, friendlier, formal, fix grammar: a toolbar, menu or chips, with replace / diff / side-by-side results and accept/reject. */
export function Rewrite({ value, onAccept, presentation = 'toolbar', resultView = 'replace', modes = ['shorten', 'expand', 'friendlier', 'formal', 'fix'], initialMode, showBadge = true, style, testID, ...hookOptions }: RewriteProps) {
  const t = useTheme()
  const motion = useMotion()
  const rw = useRewrite(hookOptions)
  const [menuOpen, setMenuOpen] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (initialMode && value && !ran.current) {
      ran.current = true
      void rw.run(value, initialMode).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, value])
  useEffect(() => {
    if (rw.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [rw.status])

  const start = (m: RewriteMode) => {
    setMenuOpen(false)
    void Haptics.selectionAsync().catch(() => {})
    void rw.run(value, m).catch(() => {})
  }
  const accept = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onAccept(rw.result)
    rw.reset()
  }
  const list = rewriteModes.filter((m) => modes.includes(m.id))
  const hasResult = rw.mode !== null && (rw.isBusy || rw.result || rw.error)

  const modeButtons =
    presentation === 'chips' ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map((m) => (
          <Chip key={m.id} label={m.label} size="sm" variant="soft" selected={rw.mode === m.id && rw.isBusy} onPress={() => start(m.id)} disabled={!value.trim()} />
        ))}
      </View>
    ) : presentation === 'menu' ? (
      <>
        <Button title="Rewrite" variant="soft" size="sm" icon={<Wand2 size={14} strokeWidth={1.5} color={t.colors.text} />} onPress={() => setMenuOpen(true)} disabled={!value.trim()} />
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} presentation="sheet" variant="solid" inline>
          <View style={{ paddingVertical: 8 }}>
            {list.map((m) => {
              const Icon = icons[m.id]
              return (
                <Pressable key={m.id} onPress={() => start(m.id)} accessibilityRole="menuitem" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 20, backgroundColor: pressed ? t.colors.elevatedHover : 'transparent' })}>
                  <Icon size={16} strokeWidth={1.5} color={t.colors.textSecondary} />
                  <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>{m.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </Sheet>
      </>
    ) : (
      <ScrollView horizontal focusable showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4, padding: 4 }} style={{ borderRadius: t.radii.pill, backgroundColor: t.colors.elevated, borderWidth: hairlineWidth, borderColor: t.colors.hairline, alignSelf: 'flex-start', maxWidth: '100%' }}>
        {list.map((m) => {
          const Icon = icons[m.id]
          const on = rw.mode === m.id && rw.isBusy
          return (
            <Pressable key={m.id} onPress={() => start(m.id)} disabled={!value.trim()} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: t.radii.pill, backgroundColor: on ? t.colors.text : pressed ? t.colors.elevatedHover : 'transparent', opacity: value.trim() ? 1 : 0.4 })}>
              <Icon size={14} strokeWidth={1.5} color={on ? t.colors.bg : t.colors.textSecondary} />
              <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: on ? t.colors.bg : t.colors.text }]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    )

  const resultBody = rw.error ? (
    <View style={{ gap: 8 }}>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>{rw.error.message}</Text>
      {rw.error.kind !== 'refusal' && rw.mode ? <Button title="Try again" variant="soft" size="sm" onPress={() => start(rw.mode!)} /> : null}
    </View>
  ) : resultView === 'diff' && !rw.isBusy && rw.result ? (
    <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>
      {wordDiff(rw.original, rw.result).map((p, i) =>
        p.type === 'equal' ? (
          <Text key={i}>{p.text}</Text>
        ) : p.type === 'add' ? (
          <Text key={i} style={{ backgroundColor: t.colors.successSoft, color: t.colors.text }}>{p.text}</Text>
        ) : (
          <Text key={i} style={{ backgroundColor: t.colors.dangerSoft, color: t.colors.textTertiary, textDecorationLine: 'line-through' }}>{p.text}</Text>
        ),
      )}
    </Text>
  ) : resultView === 'sideBySide' ? (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary }]}>Before</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{rw.original}</Text>
      </View>
      <View style={{ width: hairlineWidth, backgroundColor: t.colors.hairline }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary }]}>After</Text>
        <StreamingText text={rw.result} streaming={rw.status === 'streaming'} size="sm" />
      </View>
    </View>
  ) : (
    <StreamingText text={rw.result} streaming={rw.status === 'streaming'} size="md" placeholder="" />
  )

  return (
    <View style={[{ gap: 10 }, style]} testID={testID}>
      {modeButtons}
      {hasResult ? (
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
          <IonBorder active={rw.isBusy} radius="lg" glow={rw.isBusy}>
            <View style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>{rewriteModes.find((m) => m.id === rw.mode)?.label ?? 'Rewrite'}</Text>
                {showBadge ? <OnDeviceBadge size="sm" state={rw.status} provider={rw.provider} locality={rw.locality as never} /> : null}
              </View>
              {rw.status === 'thinking' ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>Rewriting…</Text> : resultBody}
              {!rw.isBusy && rw.result ? (
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  <Button title="Keep original" variant="ghost" size="sm" icon={<X size={14} strokeWidth={1.5} color={t.colors.textSecondary} />} onPress={() => rw.reset()} />
                  <Button title="Use this" variant="solid" size="sm" icon={<Check size={14} strokeWidth={1.75} color={t.colors.bg} />} onPress={accept} />
                </View>
              ) : null}
            </View>
          </IonBorder>
        </Animated.View>
      ) : null}
    </View>
  )
}

export default Rewrite
