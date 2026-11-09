import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { hairlineWidth, typeStyle, useSkin, useTheme } from '@ondai/tokens/react'
import type { AiState, SkinInput } from '@ondai/tokens'
import { IonBorder } from '../ion-border/ion-border'

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  hint?: string
  error?: string
  /** AI state drives the ion border: thinking/streaming animate, focus shows the ring. */
  state?: AiState
  left?: ReactNode
  right?: ReactNode
  size?: 'md' | 'lg'
  /** Confidence 0..1 rendered as a soft underline/highlight (SmartInput). */
  confidence?: number
  confidenceStyle?: 'highlight' | 'badge' | 'underline' | 'none'
  /** The look: fill, edge and corner from the skin. Defaults to the nearest SkinProvider. */
  skin?: SkinInput
  /** Corner radius override. */
  radius?: number
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Text field wrapped in an IonBorder: quiet when idle, lit only while the AI works on it. */
export const Field = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function Field({ label, hint, error, state = 'idle', left, right, size = 'md', confidence, confidenceStyle = 'highlight', skin, radius, style, testID, onFocus, onBlur, editable = true, ...input }, ref) {
  const t = useTheme()
  const s = useSkin(skin)
  const skinned = s.skin !== 'clean'
  const baseFill = skinned ? s.field.fill : t.colors.input
  const baseBorder = skinned ? (s.skin === 'metal' ? s.metal.stroke[1] : s.field.border) : t.colors.hairlineStrong
  const [focused, setFocused] = useState(false)
  const active = state === 'thinking' || state === 'streaming' || state === 'tool'
  const showConf = confidence !== undefined && confidenceStyle !== 'none'
  const confColor = confidence !== undefined ? (confidence >= 0.8 ? t.colors.accent.solid : confidence >= 0.5 ? t.colors.warning : t.colors.danger) : t.colors.hairline
  return (
    <View style={[{ gap: 6 }, style]} testID={testID}>
      {label ? <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>{label}</Text> : null}
      <IonBorder active={active} focused={focused || state === 'focus'} radius={radius ?? (skinned ? s.radius.control : 'md')} fill={showConf && confidenceStyle === 'highlight' ? mixSoft(confColor, baseFill) : baseFill} borderColor={error ? t.colors.danger : baseBorder} shadow={t.scheme === 'dark' ? 'none' : 'sm'} width={1.25}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: size === 'lg' ? 50 : 44, paddingHorizontal: 12, gap: 8 }}>
          {left}
          <TextInput
            ref={ref}
            {...input}
            accessibilityLabel={input.accessibilityLabel ?? label ?? input.placeholder}
            editable={editable}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              onBlur?.(e)
            }}
            placeholderTextColor={t.colors.textTertiary}
            selectionColor={s.tint}
            style={[typeStyle(t, size === 'lg' ? 'lg' : 'md'), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 10, outlineStyle: 'none' } as never]}
          />
          {showConf && confidenceStyle === 'badge' ? (
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: confColor }]}>{Math.round((confidence ?? 0) * 100)}%</Text>
          ) : null}
          {/* Its own box: centred in the row (a Button aligns itself to the top) and never squeezed by the text. */}
          {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
        </View>
        {showConf && confidenceStyle === 'underline' ? <View style={{ height: 2, marginHorizontal: 12, marginBottom: 6, borderRadius: 1, backgroundColor: confColor, opacity: 0.7, width: `${Math.round((confidence ?? 0) * 100)}%` as never }} /> : null}
      </IonBorder>
      {error ? (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{hint}</Text>
      ) : null}
      {error ? <View style={{ height: hairlineWidth }} /> : null}
    </View>
  )
})

function mixSoft(color: string, base: string): string {
  // A faint 6% tint of the confidence color over the input background (rgba blend done by stacking in RN is unreliable, so approximate).
  if (!color.startsWith('#') || !base.startsWith('#')) return base
  const c = parseInt(color.slice(1, 7), 16)
  const b = parseInt(base.slice(1, 7), 16)
  const ch = (shift: number) => Math.round(((b >> shift) & 255) * 0.94 + ((c >> shift) & 255) * 0.06)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

export default Field
