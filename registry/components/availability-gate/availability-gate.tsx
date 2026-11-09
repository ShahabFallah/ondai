import type { ReactNode } from 'react'
import { Linking, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowDownToLine, ArrowUpRight, Clock, Cpu, Languages, MoonStar, Plug, RotateCw, Settings, ShieldOff, Smartphone, type LucideIcon } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type Availability, type Capability, type UnavailableReason } from '@ondai/core'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ModelDownload } from '../model-download/model-download'
import { Skeleton } from '../skeleton/skeleton'
import { Surface } from '../surface/surface'

export interface AvailabilityGateProps {
  capability?: Capability
  variant?: 'card' | 'inline' | 'fullscreen'
  /** Force a state (playground / tests). */
  availability?: Availability
  children: ReactNode
  /** Shown instead of children when unavailable; defaults to the built-in empty state. */
  fallback?: ReactNode
  /** Hide children entirely while checking (default: show a skeleton). */
  hideWhileChecking?: boolean
  onLearnMore?: (url: string) => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Short, friendly copy per reason. Links and retry rules still come from `availabilityCopy`. */
const empty: Record<UnavailableReason, { icon: LucideIcon; title: string; body: string; link?: string }> = {
  'device-not-eligible': { icon: Cpu, title: 'Not on this device', body: 'There is no on-device model here. Everything else still works.', link: 'Which devices' },
  'not-enabled': { icon: Settings, title: 'Turn on Apple Intelligence', body: 'Flip it on in Settings, then come back.', link: 'Open Settings' },
  'model-downloading': { icon: ArrowDownToLine, title: 'Getting the model ready', body: 'A few minutes on Wi-Fi. Worth the wait.' },
  'unsupported-os': { icon: Smartphone, title: 'Time for an update', body: 'On-device AI needs iOS 26 or Android 14.', link: 'Learn more' },
  'unsupported-language': { icon: Languages, title: 'Not in this language yet', body: 'Try English for now. More are on the way.' },
  'background-blocked': { icon: MoonStar, title: 'Paused in the background', body: 'Bring the app to the front to keep going.' },
  quota: { icon: Clock, title: 'Taking a short break', body: 'The model hit its limit. Try again in a bit.' },
  'no-provider': { icon: Plug, title: 'No model connected', body: 'Add a provider to createOndai() to switch this on.', link: 'Read the docs' },
  unknown: { icon: ShieldOff, title: 'On-device AI is unavailable', body: 'It may be off, not supported, or still downloading.', link: 'Learn more' },
}

/** Renders children only when the on-device model is ready; otherwise a quiet empty state or download progress. */
export function AvailabilityGate({ capability = 'text', variant = 'card', availability, children, fallback, hideWhileChecking, onLearnMore, style, testID }: AvailabilityGateProps) {
  const t = useTheme()
  const model = useLocalModel(capability)
  const av = availability ?? model.availability
  const copy = availabilityCopy(av)

  if (!av) {
    if (hideWhileChecking) return null
    return (
      <View style={style} testID={testID}>
        <Skeleton lines={2} />
      </View>
    )
  }
  if (av.status === 'ready') return <>{children}</>
  if (fallback) return <>{fallback}</>

  const reason: UnavailableReason = av.status === 'preparing' ? 'model-downloading' : av.reason
  const e = empty[reason] ?? { icon: ShieldOff, title: copy.title, body: copy.description }
  const Icon = e.icon
  const learn = () => {
    if (!copy.learnMore) return
    if (onLearnMore) onLearnMore(copy.learnMore)
    else void Linking.openURL(copy.learnMore).catch(() => {})
  }
  const inline = variant === 'inline'
  const full = variant === 'fullscreen'
  const center = !inline

  const actions =
    copy.learnMore || copy.canRetry ? (
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: center ? 'center' : 'flex-start', marginTop: inline ? 4 : 8 }}>
        {copy.learnMore ? (
          <Button title={e.link ?? 'Learn more'} variant="outline" size="sm" accessibilityLabel={e.link ?? 'Learn more'} iconRight={<ArrowUpRight size={14} strokeWidth={1.75} color={t.colors.textSecondary} />} onPress={learn} />
        ) : null}
        {copy.canRetry ? (
          <Button
            title="Check again"
            variant={copy.learnMore ? 'ghost' : 'outline'}
            size="sm"
            icon={<RotateCw size={14} strokeWidth={1.75} color={t.colors.textSecondary} />}
            onPress={() => void model.refresh()}
          />
        ) : null}
      </View>
    ) : null

  const text = (
    <View style={{ gap: 4, alignItems: center ? 'center' : 'flex-start', flexShrink: 1 }}>
      <Text style={[typeStyle(t, full ? 'lg' : 'md', { weight: 'medium' }), { color: t.colors.text, textAlign: center ? 'center' : 'left' }]}>{e.title}</Text>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, textAlign: center ? 'center' : 'left', maxWidth: 300 }]}>{e.body}</Text>
    </View>
  )
  const progress =
    av.status === 'preparing' ? (
      <ModelDownload progress={av.progress} variant="bar" size="sm" label="Downloading" style={{ alignSelf: 'stretch', marginTop: inline ? 6 : 10, maxWidth: inline ? undefined : 260, width: inline ? undefined : '100%' }} />
    ) : null

  const iconTile = <Icon size={full ? 22 : inline ? 16 : 18} strokeWidth={1.75} color={t.colors.textSecondary} />

  if (inline) {
    return (
      <View testID={testID} accessibilityRole="summary" style={[{ flexDirection: 'row', gap: 12, paddingVertical: 8, alignItems: 'flex-start' }, style]}>
        {iconTile}
        <View style={{ flex: 1, gap: 0 }}>
          {text}
          {progress}
          {actions}
        </View>
      </View>
    )
  }
  return (
    <Surface
      testID={testID}
      accessibilityRole="summary"
      material={variant === 'card' ? 'auto' : 'solid'}
      elevation={variant === 'card' ? 'card' : 'inset'}
      style={[
        { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28 },
        variant !== 'card' && { backgroundColor: 'transparent' },
        full && { flex: 1, justifyContent: 'center', padding: 32 },
        style,
      ]}
    >
      <View style={{ marginBottom: 14 }}>{iconTile}</View>
      {text}
      {progress}
      {actions}
    </Surface>
  )
}

export default AvailabilityGate
