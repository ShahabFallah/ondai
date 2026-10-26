import type { ReactNode } from 'react'
import { Linking, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { ShieldOff } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type Availability, type Capability } from '@ondai/core'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { ModelDownload } from '../model-download/model-download'
import { Skeleton } from '../skeleton/skeleton'

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

/** Renders children only when the on-device model is ready; otherwise an elegant empty state or download progress. */
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

  const learn = () => {
    if (!copy.learnMore) return
    if (onLearnMore) onLearnMore(copy.learnMore)
    else void Linking.openURL(copy.learnMore).catch(() => {})
  }
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.colors.input, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldOff size={14} strokeWidth={1.5} color={t.colors.textSecondary} />
        </View>
        <Text style={[typeStyle(t, variant === 'fullscreen' ? 'xl' : 'md', { weight: 'medium' }), { color: t.colors.text, flex: 1 }]}>{copy.title}</Text>
      </View>
      {av.status === 'preparing' ? (
        <ModelDownload progress={av.progress} variant="bar" size="sm" label="Downloading" detail={copy.description} />
      ) : (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{copy.description}</Text>
      )}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        {copy.learnMore ? (
          <Pressable onPress={learn} accessibilityRole="link" style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>Learn how to enable →</Text>
          </Pressable>
        ) : null}
        {copy.canRetry ? (
          <Pressable onPress={() => void model.refresh()} accessibilityRole="button" style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Check again</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  )
  if (variant === 'inline') {
    return (
      <View testID={testID} style={[{ gap: 8, paddingVertical: 8 }, style]}>
        {body}
      </View>
    )
  }
  return (
    <View
      testID={testID}
      style={[
        { gap: 12, padding: t.spacing[4], borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.surface },
        variant === 'fullscreen' && { flex: 1, justifyContent: 'center', padding: t.spacing[6], borderWidth: 0, backgroundColor: 'transparent' },
        style,
      ]}
    >
      {body}
    </View>
  )
}

export default AvailabilityGate
