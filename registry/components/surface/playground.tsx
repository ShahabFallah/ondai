import { Text, View } from 'react-native'
import { definePlayground, select } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Surface, type SurfaceProps } from './surface'

function SurfaceDemo({ material, elevation }: Pick<SurfaceProps, 'material' | 'elevation'>) {
  const t = useTheme()
  return (
    <View style={{ gap: 12 }}>
      <Surface material={material} elevation={elevation} style={{ padding: 16, gap: 4 }}>
        <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Friday at noon</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Sam, Priya and the venue agreed. Bring the revised budget.</Text>
      </Surface>
      <Surface material={material} elevation="inset" radius="md" style={{ paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>Inset well</Text>
      </Surface>
    </View>
  )
}

export default definePlayground({
  name: 'surface',
  title: 'Surface',
  category: 'primitive',
  description: "The container every card-shaped component draws with: solid, blurred glass, or the platform's own material (Liquid Glass on iOS 26, Material 3 on Android).",
  component: SurfaceDemo,
  controls: {
    material: select(['auto', 'solid', 'glass', 'native'], 'auto', 'Material'),
    elevation: select(['card', 'floating'], 'card', 'Elevation'),
  },
  variantKeys: ['material', 'elevation'],
  states: { card: {}, floating: { props: { elevation: 'floating' } } },
  review: ['card'],
  frame: { width: 360, padding: 24, background: 'bg' },
})
