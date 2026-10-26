import { Text, View } from 'react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { AvailabilityGate, type AvailabilityGateProps } from './availability-gate'

export function AvailabilityGateDemo(props: Omit<AvailabilityGateProps, 'children'>) {
  const t = useTheme()
  return (
    <AvailabilityGate {...props}>
      <View style={{ padding: t.spacing[4], borderRadius: t.radii.lg, backgroundColor: t.colors.surface, gap: 4 }}>
        <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Your AI feature</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Rendered only when the model is ready.</Text>
      </View>
    </AvailabilityGate>
  )
}
