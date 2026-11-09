import { Text, View } from 'react-native'
import { Mic, Sparkles } from 'lucide-react-native'
import { definePlayground, select } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { LiquidMetal, type LiquidMetalProps } from './liquid-metal'

function MetalDemo({ preset, active }: Pick<LiquidMetalProps, 'preset' | 'active'>) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
      <LiquidMetal preset={preset} active={active}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 20 }}>
          <Sparkles size={16} strokeWidth={1.75} color={t.colors.text} />
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>Ask Ondai</Text>
        </View>
      </LiquidMetal>
      <LiquidMetal shape="circle" preset={preset} active={active}>
        <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Mic size={20} strokeWidth={1.75} color={t.colors.text} />
        </View>
      </LiquidMetal>
    </View>
  )
}

export default definePlayground({
  name: 'liquid-metal',
  title: 'LiquidMetal',
  category: 'fx',
  description: "A ring of liquid metal around a button, a mic or an avatar, glowing while the model works. libraries.dev's metal-fx: Skia on iOS and Android, WebGL on web.",
  component: MetalDemo,
  controls: {
    preset: select(['chromatic', 'silver', 'gold'], 'chromatic', 'Preset'),
  },
  variantKeys: ['preset'],
  states: {
    rest: { props: { active: false }, description: 'The metal flows; the glow stays low.' },
    working: { props: { active: true }, description: 'The glow comes up while the model works.' },
  },
  review: ['rest', 'working'],
  frame: { width: 360, padding: 32, background: 'bg' },
})
