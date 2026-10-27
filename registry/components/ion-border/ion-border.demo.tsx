import { Text, View } from 'react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import type { RadiusKey } from '@ondai/tokens'
import { IonBorder, type IonBorderVariant } from './ion-border'

/** Demo wrapper used by the playground and stories; not part of the installed component. */
export function IonBorderDemo({ active, focused, variant, radius, width, glow, label }: { active?: boolean; focused?: boolean; variant?: IonBorderVariant; radius?: RadiusKey; width?: number; glow?: boolean; label?: 'short' | 'long' }) {
  const t = useTheme()
  return (
    <IonBorder active={active} focused={focused} variant={variant} radius={radius} width={width} glow={glow}>
      <View style={{ padding: t.spacing[4], gap: 6 }}>
        <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Summarizing 3 messages</Text>
        {label === 'long' ? (
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>The on-device model is reading the thread and will return a two-line TL;DR. Nothing leaves the phone.</Text>
        ) : (
          <Text style={[typeStyle(t, 'sm', { mono: true }), { color: t.colors.textTertiary }]}>on device · apple</Text>
        )}
      </View>
    </IonBorder>
  )
}
