import { boolean, definePlayground, number, select, text } from '@ondai/playground'
import { AgentAvatar } from './agent-avatar'

export default definePlayground({
  name: 'agent-avatar',
  title: 'AgentAvatar',
  category: 'fx',
  description: "The assistant's face in your app's AI states. Idle looks around, thinking hops and turns, speaking talks, sleeping breathes. Drawn by BotAvatar (libraries.dev).",
  component: AgentAvatar,
  controls: {
    shape: select(['chip', 'blob', 'square', 'pill', 'drop'], 'chip', 'Shape'),
    size: number(96, { min: 32, max: 200, step: 4, label: 'Size' }),
    color: text('', 'Color'),
    interactive: boolean(true, 'Touch and pointer'),
  },
  variantKeys: ['shape'],
  states: {
    idle: { props: { state: 'idle' }, description: 'Glances around and blinks; now and then a little jump.' },
    thinking: { props: { state: 'thinking' }, description: 'Hops while the model works, turning round every third hop.' },
    speaking: { props: { state: 'speaking' }, description: 'Hops with a mouth.' },
    sleeping: { props: { state: 'sleeping' }, description: 'Head down, slow breaths.' },
  },
  review: ['idle', 'thinking', 'sleeping'],
  frame: { width: 280, padding: 24, background: 'bg' },
  render: (p) => <AgentAvatar {...(p as object)} color={(p.color as string) || undefined} />,
})
