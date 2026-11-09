import { Text, View, type ViewStyle } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { AvailabilityGate, type AvailabilityGateProps } from './availability-gate'

export function AvailabilityGateDemo(props: Omit<AvailabilityGateProps, 'children'>) {
  const t = useTheme()
  return (
    <AvailabilityGate {...props}>
      <View style={{ padding: 16, borderRadius: t.radii.lg, backgroundColor: t.colors.surface, borderWidth: hairlineWidth, borderColor: t.scheme === 'dark' ? t.colors.hairlineStrong : t.colors.hairline, boxShadow: t.shadows.sm, flexDirection: 'row', gap: 12, alignItems: 'center' } as ViewStyle}>
        <Sparkles size={16} strokeWidth={1.75} color={t.colors.accent.solid} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Your AI feature</Text>
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Shows up once the model is ready.</Text>
        </View>
      </View>
    </AvailabilityGate>
  )
}
