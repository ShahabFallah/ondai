import { boolean, definePlayground, number, select, text } from '@ondai/playground'
import { AgentAvatar } from './agent-avatar'

export default definePlayground({
  name: 'agent-avatar',
  title: 'AgentAvatar',
  category: 'primitive',
  description: 'A living face for the assistant. Its eyes glance around and blink; it looks up while thinking, talks while speaking, and breathes while asleep. On web it follows the pointer.',
  component: AgentAvatar,
  controls: {
    shape: select(['blob', 'square', 'pill', 'drop'], 'blob', 'Shape'),
    eyes: select(['dots', 'ovals'], 'dots', 'Eyes'),
    size: number(96, { min: 32, max: 200, step: 4, label: 'Size' }),
    color: text('', 'Color'),
    interactive: boolean(true, 'Follow the pointer'),
  },
  variantKeys: ['shape', 'eyes'],
  states: {
    idle: { props: { state: 'idle' }, description: 'Glances around every few seconds, blinks, bobs gently.' },
    thinking: { props: { state: 'thinking' }, description: 'Looks up and aside with a small orbiting light.' },
    speaking: { props: { state: 'speaking' }, description: 'A small mouth opens and closes with each syllable.' },
    sleeping: { props: { state: 'sleeping' }, description: 'Eyes close, the body sinks and breathes, a z drifts up.' },
  },
  review: ['idle', 'thinking', 'sleeping'],
  frame: { width: 280, padding: 24, background: 'bg' },
  render: (p) => <AgentAvatar {...(p as object)} color={(p.color as string) || undefined} />,
})
