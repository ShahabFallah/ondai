import { useEffect, useState } from 'react'
import { Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { ShieldAlert, ShieldCheck, Zap } from 'lucide-react-native'
import { humanize, type PendingConfirmation, type ToolRisk } from '@ondai/core'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Sheet } from '../sheet/sheet'

export interface ToolConfirmCardProps {
  pending: PendingConfirmation | null
  presentation?: 'card' | 'sheet' | 'banner'
  /** Allow editing parameters before approving. */
  editable?: boolean
  onApprove?: (input: Record<string, unknown>) => void
  onCancel?: () => void
  /** Labels for parameter keys. */
  labels?: Record<string, string>
  style?: StyleProp<ViewStyle>
  testID?: string
}

const riskCopy: Record<ToolRisk, { label: string; tone: 'muted' | 'warn' | 'danger' }> = {
  low: { label: 'Low risk', tone: 'muted' },
  medium: { label: 'Needs approval', tone: 'warn' },
  high: { label: 'High risk', tone: 'danger' },
}

/** Approval for any tool call: action, parameters and risk. Approve / Edit / Cancel. Lifts in with staggered buttons. */
export function ToolConfirmCard({ pending, presentation = 'card', editable = true, onApprove, onCancel, labels, style, testID }: ToolConfirmCardProps) {
  const t = useTheme()
  const motion = useMotion()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const lift = useSharedValue(0)
  useEffect(() => {
    setEditing(false)
    setDraft(Object.fromEntries(Object.entries(pending?.input ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])))
    lift.value = 0
    lift.value = motion.enabled ? withSpring(1, t.springs.smooth) : 1
  }, [pending?.id, motion.enabled, lift, t.springs.smooth, pending?.input])
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.98 + lift.value * 0.02 }, { translateY: (1 - lift.value) * 6 }], opacity: 0.6 + lift.value * 0.4 }), [lift])

  if (!pending) return null
  const risk = riskCopy[pending.risk]
  const riskColor = risk.tone === 'danger' ? t.colors.danger : risk.tone === 'warn' ? t.colors.warning : t.colors.textTertiary
  const RiskIcon = risk.tone === 'danger' ? ShieldAlert : risk.tone === 'warn' ? Zap : ShieldCheck
  const approve = () => {
    const input = editing
      ? Object.fromEntries(Object.entries(draft).map(([k, v]) => {
          const orig = pending.input[k]
          if (typeof orig === 'number') return [k, Number(v)]
          if (typeof orig === 'boolean') return [k, v === 'true']
          if (orig && typeof orig === 'object') {
            try {
              return [k, JSON.parse(v)]
            } catch {
              return [k, v]
            }
          }
          return [k, v]
        }))
      : pending.input
    if (onApprove) onApprove(input)
    else pending.confirm(input)
  }
  const cancel = () => (onCancel ? onCancel() : pending.cancel('Cancelled'))
  const entries = Object.entries(pending.input)

  const body = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.colors.input, alignItems: 'center', justifyContent: 'center' }}>
          <RiskIcon size={16} strokeWidth={1.5} color={riskColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>{pending.title}</Text>
          {pending.description ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{pending.description}</Text> : null}
        </View>
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: riskColor }]}>{risk.label}</Text>
      </View>
      {entries.length ? (
        <View style={{ borderRadius: t.radii.md, borderWidth: hairlineWidth, borderColor: t.colors.hairline, overflow: 'hidden' }}>
          {entries.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 40, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline }}>
              <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary, width: 92 }]} numberOfLines={1}>
                {labels?.[k] ?? humanize(k)}
              </Text>
              {editing ? (
                <TextInput value={draft[k] ?? ''} accessibilityLabel={k} onChangeText={(x) => setDraft((d) => ({ ...d, [k]: x }))} style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.text, paddingVertical: 8 }]} />
              ) : (
                <Text style={[typeStyle(t, 'sm'), { color: t.colors.text, flex: 1 }]} numberOfLines={2}>
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <Animated.View entering={motion.enabled ? FadeInDown.delay(0).duration(180) : undefined}>
          <Button title="Cancel" variant="ghost" onPress={cancel} />
        </Animated.View>
        {editable && entries.length ? (
          <Animated.View entering={motion.enabled ? FadeInDown.delay(60).duration(180) : undefined}>
            <Button title={editing ? 'Done' : 'Edit'} variant="soft" onPress={() => setEditing((e) => !e)} />
          </Animated.View>
        ) : null}
        <Animated.View entering={motion.enabled ? FadeInDown.delay(120).duration(180) : undefined}>
          <Button title="Approve" variant={risk.tone === 'danger' ? 'danger' : 'solid'} onPress={approve} />
        </Animated.View>
      </View>
    </View>
  )

  if (presentation === 'sheet') {
    return (
      <Sheet open onClose={cancel} presentation="sheet" variant="solid" inline testID={testID}>
        <View style={{ padding: 20 }}>{body}</View>
      </Sheet>
    )
  }
  if (presentation === 'banner') {
    return (
      <Animated.View style={[{ padding: 14, borderRadius: t.radii.md, backgroundColor: t.colors.elevated, borderWidth: hairlineWidth, borderColor: t.colors.hairline }, liftStyle, style]} testID={testID}>
        {body}
      </Animated.View>
    )
  }
  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      style={[
        { padding: 18, borderRadius: t.radii.xl, backgroundColor: t.colors.elevated, borderWidth: hairlineWidth, borderColor: t.colors.hairlineStrong, shadowColor: t.colors.accent.solid, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
        liftStyle,
        style,
      ]}
    >
      {body}
    </Animated.View>
  )
}

export default ToolConfirmCard
