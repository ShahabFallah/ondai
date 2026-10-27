import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import type { AiState } from '@ondai/tokens'
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
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Text field wrapped in an IonBorder: quiet when idle, lit only while the AI works on it. */
export const Field = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function Field({ label, hint, error, state = 'idle', left, right, size = 'md', confidence, confidenceStyle = 'highlight', style, testID, onFocus, onBlur, editable = true, ...input }, ref) {
  const t = useTheme()
  const [focused, setFocused] = useState(false)
  const active = state === 'thinking' || state === 'streaming' || state === 'tool'
  const showConf = confidence !== undefined && confidenceStyle !== 'none'
  const confColor = confidence !== undefined ? (confidence >= 0.8 ? t.colors.accent.solid : confidence >= 0.5 ? t.colors.warning : t.colors.danger) : t.colors.hairline
  return (
    <View style={[{ gap: 6 }, style]} testID={testID}>
      {label ? <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>{label}</Text> : null}
      <IonBorder active={active} focused={focused || state === 'focus'} radius="md" fill={showConf && confidenceStyle === 'highlight' ? mixSoft(confColor, t.colors.input) : t.colors.input} width={1.5}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: size === 'lg' ? 52 : 44, paddingHorizontal: 12, gap: 10 }}>
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
            selectionColor={t.colors.accent.solid}
            style={[typeStyle(t, size === 'lg' ? 'lg' : 'md'), { flex: 1, color: t.colors.text, paddingVertical: 10, outlineStyle: 'none' } as never]}
          />
          {showConf && confidenceStyle === 'badge' ? (
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: confColor }]}>{Math.round((confidence ?? 0) * 100)}%</Text>
          ) : null}
          {right}
        </View>
        {showConf && confidenceStyle === 'underline' ? <View style={{ height: 2, marginHorizontal: 12, marginBottom: 6, borderRadius: 1, backgroundColor: confColor, width: `${Math.round((confidence ?? 0) * 100)}%` as never }} /> : null}
      </IonBorder>
      {error ? (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>{hint}</Text>
      ) : null}
      {error ? <View style={{ height: hairlineWidth }} /> : null}
    </View>
  )
})

function mixSoft(color: string, base: string): string {
  // 14% tint of the confidence color over the input background (rgba blend done by stacking in RN is unreliable, so approximate).
  if (!color.startsWith('#') || !base.startsWith('#')) return base
  const c = parseInt(color.slice(1, 7), 16)
  const b = parseInt(base.slice(1, 7), 16)
  const ch = (shift: number) => Math.round(((b >> shift) & 255) * 0.86 + ((c >> shift) & 255) * 0.14)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

export default Field
