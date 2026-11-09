import { View } from 'react-native'
import { definePlayground, number, select } from '@ondai/playground'
import { BotAvatar } from './bot-avatar'

const types = ['chip', 'clover', 'blob', 'square', 'pill', 'drop', 'ghost', 'droid'] as const

export default definePlayground({
  name: 'bot-avatar',
  title: 'BotAvatar',
  category: 'fx',
  description: "A glossy little body with eyes. It blinks, glances, hops while the model works and sleeps when idle. libraries.dev's bot avatars: Skia on iOS and Android, canvas on web.",
  component: BotAvatar,
  controls: {
    type: select(types, 'chip', 'Body'),
    size: number(96, { min: 32, max: 200, step: 4, label: 'Size' }),
  },
  variantKeys: ['type'],
  states: {
    idle: { props: { state: 'default' }, description: 'Looks around and blinks.' },
    working: { props: { state: 'working' }, description: 'Hops while the model works.' },
    sleeping: { props: { state: 'sleeping' }, description: 'Head down, slow breaths.' },
    family: { description: 'Ondai chip with a few of the 18 libraries.dev bodies.' },
  },
  review: ['idle', 'working', 'family'],
  frame: { width: 360, padding: 24, background: 'bg' },
  render: (p, { state }) =>
    state === 'family' ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {types.map((ty) => (
          <BotAvatar key={ty} type={ty} size={56} />
        ))}
      </View>
    ) : (
      <View style={{ alignItems: 'center' }}>
        <BotAvatar type={p.type} size={p.size} state={(p as { state?: 'default' }).state} />
      </View>
    ),
})
