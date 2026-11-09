import { View } from 'react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { ShimmerText } from './shimmer-text'

export default definePlayground({
  name: 'shimmer-text',
  title: 'ShimmerText',
  category: 'primitive',
  description: 'Text with a soft light running across it while the model works.',
  component: ShimmerText,
  controls: {
    text: text('Reading 3 messages', 'Text'),
    size: select(['xs', 'sm', 'md', 'lg'], 'md', 'Size'),
    active: boolean(true, 'Active'),
  },
  variantKeys: ['size'],
  states: {
    thinking: {},
    steps: { description: 'Stacked like a trace: the live step shimmers, finished steps rest.' },
    done: { props: { active: false } },
  },
  review: ['thinking', 'steps'],
  frame: { width: 320, padding: 24, background: 'bg' },
  render: (p, ctx) =>
    ctx.state === 'steps' ? (
      <View style={{ gap: 8 }}>
        <ShimmerText active={false} size="sm">Searched your notes</ShimmerText>
        <ShimmerText active={false} size="sm">Found 4 receipts from March</ShimmerText>
        <ShimmerText size="sm">Adding up the totals</ShimmerText>
      </View>
    ) : (
      <ShimmerText size={p.size} active={p.active}>{String(p.text)}</ShimmerText>
    ),
})
