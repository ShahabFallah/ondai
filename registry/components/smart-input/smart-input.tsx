import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Camera, Check, Mic, RotateCcw, Sparkles } from 'lucide-react-native'
import type { z } from 'zod'
import { humanize } from '@ondai/core'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { Field } from '../field/field'
import { IonBorder } from '../ion-border/ion-border'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { useSmartForm, type SmartFormState, type UseSmartFormOptions } from './use-smart-form'

export interface SmartInputProps<S extends z.ZodObject<z.ZodRawShape>> extends UseSmartFormOptions<S> {
  presentation?: 'field' | 'composer' | 'overlay' | 'card'
  confidenceStyle?: 'highlight' | 'badge' | 'underline'
  placeholder?: string
  /** Show the mic button; `onVoice` returns transcribed text. */
  voice?: boolean
  onVoice?: () => Promise<string>
  /** Show the camera button; `onCamera` returns OCR text. */
  camera?: boolean
  onCamera?: () => Promise<string>
  /** Pre-filled input (playground). */
  initialText?: string
  autoRun?: boolean
  /** Render-prop to show the developer's own form, given the smart form state (overlay). */
  children?: (form: SmartFormState<S>) => ReactNode
  /** Expose the hook state (controlled usage). */
  onState?: (form: SmartFormState<S>) => void
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Text, voice or photo fills your zod form. Per-field confidence, confirm/undo, four presentations. */
export function SmartInput<S extends z.ZodObject<z.ZodRawShape>>({ presentation = 'field', confidenceStyle = 'highlight', placeholder = 'Describe it in your own words…', voice = true, onVoice, camera = false, onCamera, initialText = '', autoRun = false, children, onState, showBadge = true, style, testID, ...hookOptions }: SmartInputProps<S>) {
  const t = useTheme()
  const motion = useMotion()
  const form = useSmartForm(hookOptions)
  const [text, setText] = useState(initialText)
  const ran = useRef(false)
  const busy = form.isLoading
  useEffect(() => {
    onState?.(form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values, form.fields, form.status])
  useEffect(() => {
    if (autoRun && initialText && !ran.current) {
      ran.current = true
      void form.fill(initialText).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialText])
  useEffect(() => {
    if (form.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [form.status])

  const submit = () => {
    if (!text.trim() || busy) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    void form.fill(text).catch(() => {})
  }
  const mic = voice && onVoice ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Speak" hitSlop={8} onPress={() => void onVoice().then((s) => (setText(s), form.fill(s))).catch(() => {})} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Mic size={18} strokeWidth={1.5} color={t.colors.textSecondary} />
    </Pressable>
  ) : null
  const cam = camera && onCamera ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Scan" hitSlop={8} onPress={() => void onCamera().then((s) => (setText(s), form.fill(s))).catch(() => {})} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Camera size={18} strokeWidth={1.5} color={t.colors.textSecondary} />
    </Pressable>
  ) : null

  const input = (
    <Field
      testID={testID ? `${testID}-input` : undefined}
      value={text}
      onChangeText={setText}
      onSubmitEditing={submit}
      placeholder={placeholder}
      state={form.status}
      returnKeyType="done"
      size={presentation === 'composer' ? 'lg' : 'md'}
      left={busy ? undefined : <Sparkles size={16} strokeWidth={1.5} color={t.colors.accent.solid} />}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {cam}
          {mic}
          {presentation === 'composer' ? <Button title="Fill" size="sm" variant="solid" onPress={submit} loading={busy} disabled={!text.trim()} /> : null}
        </View>
      }
    />
  )

  const fieldsView = (
    <View style={{ gap: 10 }}>
      {form.fieldInfo.map((f) => {
        const r = form.fields[f.name]
        const value = form.values[f.name as keyof typeof form.values]
        if (value === undefined && !r) return null
        const conf = r?.confidence ?? 0
        const label = hookOptions.labels?.[f.name as never] ?? humanize(f.name)
        return (
          <Animated.View key={f.name} entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
            <Field
              label={label}
              value={value === undefined ? '' : String(value instanceof Date ? value.toLocaleString() : value)}
              onChangeText={(v) => form.setField(f.name as never, f.type === 'number' ? Number(v) : v)}
              confidence={conf}
              confidenceStyle={confidenceStyle}
              right={
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {conf < 1 ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Confirm ${label}`} hitSlop={8} onPress={() => form.confirmField(f.name as never)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} strokeWidth={1.75} color={t.colors.accent.solid} />
                    </Pressable>
                  ) : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Undo ${label}`} hitSlop={8} onPress={() => form.undoField(f.name as never)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={14} strokeWidth={1.5} color={t.colors.textTertiary} />
                  </Pressable>
                </View>
              }
            />
          </Animated.View>
        )
      })}
    </View>
  )

  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
      {showBadge ? <OnDeviceBadge size="sm" state={form.status} provider={form.provider} locality={form.locality as never} /> : <View />}
      {form.confidence !== null ? <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`confidence ${Math.round(form.confidence * 100)}%`}</Text> : null}
    </View>
  )
  const errorView = form.error ? (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: t.radii.md, borderWidth: hairlineWidth, borderColor: t.colors.danger, gap: 6 }}>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>{form.error.message}</Text>
      {form.error.kind !== 'refusal' ? (
        <Pressable onPress={submit} accessibilityRole="button" style={{ minHeight: 28, justifyContent: 'center' }}>
          <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null

  if (presentation === 'card') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        {input}
        {errorView}
        {Object.keys(form.values).length ? (
          <IonBorder active={busy} radius="lg">
            <View style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(form.values).map(([k, v]) =>
                  v === undefined ? null : <Chip key={k} size="sm" variant="soft" label={`${hookOptions.labels?.[k as never] ?? humanize(k)}: ${String(v)}`} ghost={(form.fields[k]?.confidence ?? 1) < 0.6} />,
                )}
              </View>
              {footer}
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Button title="Undo" variant="ghost" size="sm" onPress={form.undoAll} />
                <Button title="Use these" variant="solid" size="sm" onPress={() => form.fieldInfo.forEach((f) => form.confirmField(f.name as never))} />
              </View>
            </View>
          </IonBorder>
        ) : (
          footer
        )}
      </View>
    )
  }
  if (presentation === 'overlay') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        {input}
        {errorView}
        {children ? children(form) : fieldsView}
        {footer}
      </View>
    )
  }
  if (presentation === 'composer') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        {Object.keys(form.values).length ? fieldsView : null}
        {errorView}
        {input}
        {footer}
      </View>
    )
  }
  return (
    <View style={[{ gap: 12 }, style]} testID={testID}>
      {input}
      {errorView}
      {Object.keys(form.values).length ? fieldsView : null}
      {footer}
    </View>
  )
}

export default SmartInput
