import type { StyleProp, ViewStyle } from 'react-native'
import { BotAvatar } from '../bot-avatar/bot-avatar'

export type AgentAvatarShape = 'chip' | 'blob' | 'square' | 'pill' | 'drop'
export type AgentAvatarState = 'idle' | 'thinking' | 'speaking' | 'sleeping'

export interface AgentAvatarProps {
  /** Width and height in pt (default 64). */
  size?: number
  shape?: AgentAvatarShape
  state?: AgentAvatarState
  /** Body colour. Defaults to chrome on `chip` and each shape's own colour elsewhere. */
  color?: string
  /** A tap makes it hop; a resting finger (or the pointer on web) draws its eyes. */
  interactive?: boolean
  /** Accessible name; the state is appended ("Assistant, thinking"). */
  name?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const engineState = { idle: 'default', thinking: 'working', speaking: 'working', sleeping: 'sleeping' } as const

/**
 * The assistant's face, in the language of your app's AI states. A thin layer over BotAvatar
 * (libraries.dev's bot avatars): idle looks around, thinking and speaking hop and turn, sleeping breathes.
 */
export function AgentAvatar({ size = 64, shape = 'chip', state = 'idle', color, interactive = true, name = 'Assistant', style, testID }: AgentAvatarProps) {
  return (
    <BotAvatar
      type={shape}
      face={state === 'speaking' ? 'mouth' : undefined}
      state={engineState[state]}
      size={size}
      color={color}
      interactive={interactive}
      accessibilityLabel={state === 'idle' ? name : `${name}, ${state}`}
      style={style}
      testID={testID}
    />
  )
}

export default AgentAvatar
