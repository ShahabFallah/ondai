import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'

export interface KeyHintProps {
  /** e.g. ['⌘', 'K'] or ['esc']. Common words are mapped to symbols: cmd, shift, enter, esc, tab, up, down. */
  keys: string[]
  size?: 'sm' | 'md'
  /** `caps` draws key caps; `plain` is text only. */
  variant?: 'caps' | 'plain'
  style?: StyleProp<ViewStyle>
  testID?: string
}

const symbols: Record<string, string> = { cmd: '⌘', command: '⌘', shift: '⇧', alt: '⌥', option: '⌥', ctrl: '⌃', control: '⌃', enter: '↵', return: '↵', esc: 'esc', escape: 'esc', tab: '⇥', up: '↑', down: '↓', left: '←', right: '→', space: '␣', backspace: '⌫' }

/** Mono key caps for keyboard hints on tablet, desktop and web. */
export function KeyHint({ keys, size = 'md', variant = 'caps', style, testID }: KeyHintProps) {
  const t = useTheme()
  const h = size === 'sm' ? 18 : 22
  return (
    <View testID={testID} accessibilityRole="text" accessibilityLabel={keys.join(' ')} style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, style]}>
      {keys.map((k, i) => {
        const label = symbols[k.toLowerCase()] ?? k
        return (
          <View
            key={`${k}-${i}`}
            style={
              variant === 'caps'
                ? { minWidth: h, height: h, paddingHorizontal: 5, borderRadius: 5, borderWidth: hairlineWidth, borderColor: t.colors.hairlineStrong, backgroundColor: t.colors.elevated, alignItems: 'center', justifyContent: 'center' }
                : { paddingHorizontal: 1 }
            }
          >
            <Text style={[typeStyle(t, size === 'sm' ? 'xs' : 'sm', { mono: true, weight: 'medium' }), { color: t.colors.textSecondary, lineHeight: h - 2 }]}>{label}</Text>
          </View>
        )
      })}
    </View>
  )
}

export default KeyHint
