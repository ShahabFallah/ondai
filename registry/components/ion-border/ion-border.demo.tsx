import { Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import type { RadiusKey } from '@ondai/tokens'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { IonBorder, type IonBorderVariant } from './ion-border'

/** Demo wrapper used by the playground and stories; not part of the installed component. */
export function IonBorderDemo({ active, focused, variant, radius, width, glow, label }: { active?: boolean; focused?: boolean; variant?: IonBorderVariant; radius?: RadiusKey; width?: number; glow?: boolean; label?: 'short' | 'long' }) {
  const t = useTheme()
  return (
    <IonBorder active={active} focused={focused} variant={variant} radius={radius} width={width} glow={glow} shadow="sm">
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} strokeWidth={1.75} color={active ? t.colors.accent.solid : t.colors.textTertiary} />
          <ShimmerText active={!!active} size="md" weight="medium" color={active ? undefined : t.colors.text}>
            {active ? 'Summarizing 3 messages' : 'Summary ready'}
          </ShimmerText>
        </View>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, paddingLeft: 23 }]}>
          {label === 'long' ? 'Reading the thread on this phone. Nothing leaves it.' : 'Sam, Priya and the venue'}
        </Text>
      </View>
    </IonBorder>
  )
}
