import { Text, View } from 'react-native'
import { definePlayground, select } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Surface } from '../surface/surface'
import { BorderBeam, type BorderBeamProps } from './border-beam'

function BeamCard({ active, tone, size }: Pick<BorderBeamProps, 'active' | 'tone' | 'size'>) {
  const t = useTheme()
  return (
    <BorderBeam active={active} tone={tone} size={size} radius="lg">
      <Surface style={{ padding: 16, gap: 6 }}>
        {active ? (
          <ShimmerText size="sm" weight="medium" active>
            Summarizing 3 messages
          </ShimmerText>
        ) : (
          <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>Summary ready</Text>
        )}
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Sam, Priya and the venue agreed on Friday at noon.</Text>
      </Surface>
    </BorderBeam>
  )
}

export default definePlayground({
  name: 'border-beam',
  title: 'BorderBeam',
  category: 'fx',
  description: "A light that travels around a card's border while the model works. libraries.dev's border beam: Skia on iOS and Android, CSS on web.",
  component: BeamCard,
  controls: {
    tone: select(['colorful', 'mono', 'ocean', 'sunset'], 'colorful', 'Tone'),
    size: select(['md', 'sm', 'line', 'pulse-inner', 'pulse-outside'], 'md', 'Size'),
  },
  variantKeys: ['tone', 'size'],
  states: {
    working: { props: { active: true }, description: 'The beam travels while the model works.' },
    done: { props: { active: false }, description: 'Fades out in half a second when the work ends.' },
  },
  review: ['working', 'done'],
  frame: { width: 380, padding: 28, background: 'bg' },
})
