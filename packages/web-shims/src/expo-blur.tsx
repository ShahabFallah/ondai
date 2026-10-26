import { View, type ViewProps } from 'react-native'

export type BlurTint = 'light' | 'dark' | 'default' | 'extraLight' | 'regular' | 'prominent' | 'systemMaterial' | (string & {})

export interface BlurViewProps extends ViewProps {
  intensity?: number
  tint?: BlurTint
  experimentalBlurMethod?: string
}

/** Browser stand-in for expo-blur: CSS backdrop-filter (mirrors expo's own web implementation). */
export function BlurView({ intensity = 50, tint = 'default', style, children, ...rest }: BlurViewProps) {
  const dark = tint === 'dark' || tint === 'systemMaterial' || tint === 'prominent'
  const light = tint === 'light' || tint === 'extraLight'
  const bg = dark ? `rgba(14,16,19,${0.4 + intensity / 250})` : light ? `rgba(255,255,255,${0.4 + intensity / 250})` : 'transparent'
  const web = { backdropFilter: `blur(${intensity / 4}px)`, WebkitBackdropFilter: `blur(${intensity / 4}px)`, backgroundColor: bg }
  return (
    <View {...rest} style={[style, web as never]}>
      {children}
    </View>
  )
}
export default BlurView
