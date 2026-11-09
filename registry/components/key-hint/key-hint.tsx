import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useSkin, useTheme } from '@ondai/tokens/react'

export interface KeyHintProps {
  /** e.g. ['⌘', 'K'] or ['esc']. Common words are mapped to symbols: cmd, shift, enter, esc, tab, up, down. */
  keys: string[]
  size?: 'sm' | 'md'
  /** `caps` draws key caps; `plain` is text only. */
  variant?: 'caps' | 'plain'
  /** The look of the caps. Defaults to the nearest SkinProvider: `pop` caps have a ledge, `candy` a gloss, `metal` a brushed edge, `bevel` a lit face. */
  skin?: SkinInput
  style?: StyleProp<ViewStyle>
  testID?: string
}

const symbols: Record<string, string> = { cmd: '⌘', command: '⌘', shift: '⇧', alt: '⌥', option: '⌥', ctrl: '⌃', control: '⌃', enter: '↵', return: '↵', esc: 'esc', escape: 'esc', tab: '⇥', up: '↑', down: '↓', left: '←', right: '→', space: '␣', backspace: '⌫' }

/** Small key caps for keyboard hints on tablet, desktop and web. */
export function KeyHint({ keys, size = 'md', variant = 'caps', skin, style, testID }: KeyHintProps) {
  const t = useTheme()
  const s = useSkin(skin)
  const h = size === 'sm' ? 18 : 20
  return (
    <View testID={testID} accessibilityRole="text" accessibilityLabel={keys.join(' ')} style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, style]}>
      {keys.map((k, i) => {
        const label = symbols[k.toLowerCase()] ?? k
        return (
          <View
            key={`${k}-${i}`}
            style={
              variant === 'caps'
                ? [{ minWidth: h, height: h, paddingHorizontal: 5, borderRadius: 5, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.muted, alignItems: 'center', justifyContent: 'center' }, capSkin(s)]
                : { paddingHorizontal: 1 }
            }
          >
            <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary, lineHeight: h - 2, fontSize: size === 'sm' ? 11 : 12 }]}>{label}</Text>
          </View>
        )
      })}
    </View>
  )
}

/** Cap looks per skin; `clean`, `minimal` and `shine` keep the quiet cap. */
function capSkin(s: SkinTokens): ViewStyle | null {
  const p = s.secondary
  switch (s.skin) {
    case 'pop':
      return { backgroundColor: p.fill, borderWidth: 1, borderColor: p.border, borderBottomWidth: 2.5, borderBottomColor: p.border }
    case 'candy':
      return { backgroundColor: p.fill, borderColor: p.border, boxShadow: `inset 0 1px 0 ${p.candy?.highlight ?? 'transparent'}, 0 1px 2px rgba(0,0,0,${s.dark ? 0.4 : 0.1})` } as ViewStyle
    case 'metal':
      return { backgroundColor: s.metal.well, borderColor: s.metal.stroke[1] }
    case 'glass':
      return { backgroundColor: p.fill, borderColor: p.border, boxShadow: `inset 0 1px 0 ${s.glass?.control.rimTop ?? p.border}` } as ViewStyle
    case 'bevel': {
      const b = p.bevel!
      return { backgroundColor: b.bottom, borderColor: b.border, borderWidth: 1, boxShadow: `inset 0 1px 0 ${b.highlight}, inset 0 -1px 0 ${b.lowlight}, 0 1px 1px rgba(0,0,0,${s.dark ? 0.5 : 0.08})` } as ViewStyle
    }
    default:
      return null
  }
}

export default KeyHint
