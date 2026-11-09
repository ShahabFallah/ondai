import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowUp, Camera, Check, CircleAlert, CircleDashed, Mic, PenLine, RotateCcw } from 'lucide-react-native'
import type { z } from 'zod'
import { humanize } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { IonBorder } from '../ion-border/ion-border'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { SkinRowFace, SkinWell, skinHasWells, Surface } from '../surface/surface'
import { useSmartForm, type SmartFormState, type UseSmartFormOptions } from './use-smart-form'

/** Every icon SmartInput draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface SmartInputIcons {
  /** Leading icon in the field. */
  input: IconInput
  voice: IconInput
  camera: IconInput
  /** The key that fills the form. */
  submit: IconInput
  /** Beside a value the model filled (tap it to confirm). */
  filled: IconInput
  /** On the "Looks right" chip of an unsure value. */
  confirm: IconInput
  /** Undo one field. */
  undo: IconInput
  error: IconInput
}

/** Every string SmartInput shows or announces. `{count}`, `{total}`, `{label}` and `{percent}` are replaced where they appear. */
export interface SmartInputLabels {
  placeholder: string
  /** The line shown while the model fills the form. */
  thinking: string
  /** The composer's key. */
  fill: string
  /** Screen reader names. */
  submit: string
  voice: string
  camera: string
  /** The footer count. */
  filledCount: string
  undo: string
  undoAll: string
  /** The key that accepts every value. */
  use: string
  /** The chip on an unsure value. */
  confirm: string
  /** Placeholder in an empty row. */
  add: string
  /** Screen reader name for the filled mark. */
  filledMark: string
  retry: string
}

export interface SmartInputStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The field. */
  input: StyleProp<ViewStyle>
  /** The card of filled values. */
  fields: StyleProp<ViewStyle>
  row: StyleProp<ViewStyle>
  rowLabel: StyleProp<TextStyle>
  rowValue: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const smartInputLabels: SmartInputLabels = {
  placeholder: 'Describe it in your own words…',
  thinking: 'Filling in the details',
  fill: 'Fill',
  submit: 'Fill the form',
  voice: 'Speak',
  camera: 'Scan',
  filledCount: 'Filled {count} of {total}',
  undo: 'Undo',
  undoAll: 'Undo all',
  use: 'Use these',
  confirm: 'Looks right',
  add: 'Add',
  filledMark: 'Filled on device, {percent}% sure. Tap to confirm',
  retry: 'Retry',
}

/** What a custom field row gets. */
export interface SmartFieldRowProps {
  name: string
  label: string
  /** The value as text ('' when missing). */
  value: string
  missing: boolean
  /** 0 to 1; 1 once confirmed or edited by hand. */
  confidence: number
  onChange: (text: string) => void
  onConfirm: () => void
  onUndo: () => void
}

/** What a custom submit key gets. */
export interface SmartSubmitProps {
  canSubmit: boolean
  busy: boolean
  submit: () => void
}

/** What a custom footer gets. */
export interface SmartFooterProps<S extends z.ZodObject<z.ZodRawShape>> {
  form: SmartFormState<S>
  filled: number
  total: number
}

export interface SmartInputProps<S extends z.ZodObject<z.ZodRawShape>> extends Omit<UseSmartFormOptions<S>, 'labels'> {
  presentation?: 'field' | 'composer' | 'overlay' | 'card'
  /** How each filled field shows the model's confidence: a quiet mark (`highlight`), a percentage (`badge`), or a thin bar (`underline`). */
  confidenceStyle?: 'highlight' | 'badge' | 'underline'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the field,
   * the card of values, the chips and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the keys, the caret and the confidence bars. Defaults to the accent. */
  tint?: string
  /** Corner radius of the card of values. Defaults to the variant's. */
  radius?: number
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  icons?: Partial<SmartInputIcons>
  /** Replace any visible or announced string. (Field names go in `fieldLabels`.) */
  labels?: Partial<SmartInputLabels>
  /** How each schema field is named in the UI: `{ amount: 'Total' }`. Defaults to the humanized key. */
  fieldLabels?: Partial<Record<keyof z.infer<S> & string, string>>
  styles?: Partial<SmartInputStyles>
  /** Show the mic button; `onVoice` returns transcribed text. */
  voice?: boolean
  onVoice?: () => Promise<string>
  /** Show the camera button; `onCamera` returns OCR text. */
  camera?: boolean
  onCamera?: () => Promise<string>
  /** Shows a "Use these" key under the values; called with them once accepted. */
  onUse?: (values: Partial<z.infer<S>>) => void
  /** Pre-filled input (playground). */
  initialText?: string
  autoRun?: boolean
  /** @deprecated Use `labels.thinking`. */
  thinkingLabel?: string
  /** Draw a filled row yourself. */
  renderField?: (props: SmartFieldRowProps) => ReactNode
  /** Draw the key that fills the form yourself. */
  renderSubmit?: (props: SmartSubmitProps) => ReactNode
  /** Shown under the field before anything is filled (an example, a tip). */
  renderEmpty?: () => ReactNode
  /** Replace the footer (badge and count). */
  renderFooter?: (props: SmartFooterProps<S>) => ReactNode
  /** Render-prop to show the developer's own form, given the smart form state (overlay). */
  children?: (form: SmartFormState<S>) => ReactNode
  /** Expose the hook state (controlled usage). */
  onState?: (form: SmartFormState<S>) => void
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Below this the field asks for a look instead of showing the quiet mark. */
const unsure = 0.6

type Size = NonNullable<SmartInputProps<never>['size']>
const sizes: Record<Size, { well: number; font: FontSizeKey; label: FontSizeKey; meta: FontSizeKey; row: number; labelW: number; icon: number; key: 'sm' | 'md' | 'lg'; pad: number }> = {
  sm: { well: 42, font: 'sm', label: 'xs', meta: 'xs', row: 40, labelW: 68, icon: 15, key: 'sm', pad: 12 },
  md: { well: 48, font: 'md', label: 'sm', meta: 'xs', row: 48, labelW: 80, icon: 16, key: 'sm', pad: 14 },
  lg: { well: 56, font: 'lg', label: 'md', meta: 'sm', row: 56, labelW: 92, icon: 18, key: 'md', pad: 16 },
}
type Z = (typeof sizes)[Size]

const fillIn = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
/** A key icon: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/** Text, voice or photo fills your zod form. Per-field confidence, confirm and undo, four presentations, seven looks. */
export function SmartInput<S extends z.ZodObject<z.ZodRawShape>>({ variant, tint, ...props }: SmartInputProps<S>) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Smart {...props} />
    </SkinProvider>
  )
}

function Smart<S extends z.ZodObject<z.ZodRawShape>>({
  presentation = 'field',
  confidenceStyle = 'highlight',
  size = 'md',
  radius,
  placeholder,
  icons = {},
  labels: labelsProp,
  fieldLabels,
  styles = {},
  voice = true,
  onVoice,
  camera = false,
  onCamera,
  onUse,
  initialText = '',
  autoRun = false,
  thinkingLabel,
  renderField,
  renderSubmit,
  renderEmpty,
  renderFooter,
  children,
  onState,
  showBadge = true,
  style,
  testID,
  ...hookOptions
}: Omit<SmartInputProps<S>, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const form = useSmartForm(hookOptions)
  const labels: SmartInputLabels = { ...smartInputLabels, ...(thinkingLabel ? { thinking: thinkingLabel } : null), ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  // Older apps passed field names in `labels`; they still work when no `fieldLabels` names that field.
  const legacy = (labelsProp ?? {}) as Record<string, string | undefined>
  const nameOf = (field: string) => (fieldLabels as Record<string, string | undefined> | undefined)?.[field] ?? (field in smartInputLabels ? undefined : legacy[field]) ?? humanize(field)
  const [text, setText] = useState(initialText)
  const ran = useRef(false)
  const busy = form.isLoading
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const wells = skinHasWells(s.skin)
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
  const useAll = () => {
    form.fieldInfo.forEach((f) => form.confirmField(f.name as never))
    onUse?.(form.values)
  }
  const fromSource = (get: () => Promise<string>) => () => void get().then((v) => (setText(v), form.fill(v))).catch(() => {})
  const iconKey = (label: string, icon: ReturnType<typeof keyIcon>, onPress: () => void) => (icon ? <Button variant="ghost" size="sm" icon={icon} onPress={onPress} accessibilityLabel={label} /> : null)
  const cam = camera && onCamera ? iconKey(labels.camera, keyIcon(icons.camera, Camera), fromSource(onCamera)) : null
  const mic = voice && onVoice ? iconKey(labels.voice, keyIcon(icons.voice, Mic), fromSource(onVoice)) : null
  const canSubmit = !!text.trim() && !busy
  const composer = presentation === 'composer'
  const filledAny = Object.keys(form.values).length > 0
  // The composer's key is the primary action until there are values to use; elsewhere the field carries a quieter secondary key.
  const key = renderSubmit ? (
    renderSubmit({ canSubmit, busy, submit })
  ) : composer ? (
    <Button title={labels.fill} size={z.key} variant={filledAny ? 'raised' : 'solid'} icon={keyIcon(icons.submit, ArrowUp)} onPress={submit} loading={busy} disabled={!text.trim()} accessibilityLabel={labels.submit} testID={testID ? `${testID}-submit` : undefined} />
  ) : icons.submit === null ? null : (
    <Button size="sm" variant="raised" icon={keyIcon(icons.submit, ArrowUp)} onPress={submit} disabled={!canSubmit} accessibilityLabel={labels.submit} testID={testID ? `${testID}-submit` : undefined} />
  )
  const trailing = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: -4 }}>
      {cam}
      {mic}
      {key ? <View style={{ marginLeft: 4 }}>{key}</View> : null}
    </View>
  )
  const leading = renderIcon(icons.input, PenLine, { size: z.icon, strokeWidth: 1.75, color: busy ? t.colors.text : t.colors.textTertiary })

  // Quiet looks draw the field on an ion edge that lights while the model works (the kit's Field, with a text box
  // that can shrink); expressive ones seat the text in their well.
  const [focused, setFocused] = useState(false)
  const textInput = (
    <TextInput
      testID={testID ? `${testID}-input` : undefined}
      value={text}
      onChangeText={setText}
      onSubmitEditing={submit}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={labels.placeholder}
      placeholderTextColor={t.colors.textTertiary}
      selectionColor={s.tint}
      returnKeyType="done"
      accessibilityLabel={labels.placeholder}
      style={[typeStyle(t, composer ? 'lg' : z.font), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 10 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
    />
  )
  const inputHeight = z.well + (composer ? 6 : 0)
  const input = wells ? (
    <SkinWell style={[{ flexDirection: 'row', alignItems: 'center', minHeight: inputHeight + (s.skin === 'pop' && composer && !filledAny ? s.depth[z.key] : 0), paddingLeft: 12, paddingRight: 8, gap: 10 }, styles.input]}>
      {leading}
      {textInput}
      {trailing}
    </SkinWell>
  ) : (
    <IonBorder
      active={busy}
      focused={focused}
      radius={s.skin === 'clean' ? 'md' : s.radius.control}
      fill={s.skin === 'clean' ? t.colors.input : s.field.fill}
      borderColor={s.skin === 'clean' ? t.colors.hairlineStrong : s.field.border}
      shadow={t.scheme === 'dark' ? 'none' : 'sm'}
      width={1.25}
      style={styles.input}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: inputHeight - 4, paddingLeft: 12, paddingRight: 8, gap: 10 }}>
        {leading}
        {textInput}
        {trailing}
      </View>
    </IonBorder>
  )

  const thinking = busy ? (
    <Animated.View entering={fade} style={{ paddingHorizontal: 2 }}>
      <ShimmerText size={z.meta === 'xs' ? 'sm' : 'md'} active>
        {labels.thinking}
      </ShimmerText>
      {!Object.keys(form.values).length && presentation !== 'card' ? (
        <Surface style={{ marginTop: 12, marginHorizontal: -2, overflow: 'hidden' }}>
          {[0.5, 0.35, 0.6].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: z.row, paddingHorizontal: z.pad, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline }}>
              <Skeleton width={z.labelW - 20} height={10} />
              <View style={{ width: 20 }} />
              <Skeleton width={`${w * 100}%`} height={10} />
            </View>
          ))}
        </Surface>
      ) : null}
    </Animated.View>
  ) : null

  const visible = form.fieldInfo.filter((f) => form.values[f.name as keyof typeof form.values] !== undefined || !!form.fields[f.name])
  const filledCount = visible.filter((f) => form.values[f.name as keyof typeof form.values] !== undefined).length
  const total = form.fieldInfo.length
  const cardRadius = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 4)

  const undoAllKey = <Button title={labels.undo} variant="ghost" size="sm" icon={keyIcon(icons.undo, RotateCcw)} onPress={form.undoAll} accessibilityLabel={labels.undoAll} />
  // One card, one row per field: label, editable value, and a quiet mark for what the model filled.
  const fieldsView = visible.length ? (
    <Animated.View entering={fade}>
      <Surface radius={cardRadius} style={[{ overflow: s.skin === 'pop' ? 'visible' : 'hidden', paddingVertical: 4 }, styles.fields]}>
        {visible.map((f, i) => {
          const r = form.fields[f.name]
          const value = form.values[f.name as keyof typeof form.values]
          const row: SmartFieldRowProps = {
            name: f.name,
            label: nameOf(f.name),
            value: displayValue(value),
            missing: value === undefined,
            confidence: r?.confidence ?? 1,
            onChange: (v) => form.setField(f.name as never, f.type === 'number' ? Number(v) : v),
            onConfirm: () => form.confirmField(f.name as never),
            onUndo: () => form.undoField(f.name as never),
          }
          if (renderField) return <View key={f.name}>{renderField(row)}</View>
          return <FieldRow key={f.name} {...row} first={i === 0} confidenceStyle={confidenceStyle} z={z} icons={icons} labels={labels} styles={styles} />
        })}
        {onUse && filledCount && !busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: z.pad - 4, paddingTop: 10, paddingBottom: 6, marginTop: 4, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }}>
            <Text style={[typeStyle(t, 'xs'), { flex: 1, color: t.colors.textTertiary, paddingLeft: 4 }]} numberOfLines={1}>
              {fillIn(labels.filledCount, { count: filledCount, total })}
            </Text>
            {undoAllKey}
            <Button title={labels.use} variant="solid" size={z.key} onPress={useAll} testID={testID ? `${testID}-use` : undefined} />
          </View>
        ) : null}
      </Surface>
    </Animated.View>
  ) : null

  const footer = renderFooter ? (
    renderFooter({ form, filled: filledCount, total })
  ) : (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }, styles.footer]}>
      {showBadge ? <OnDeviceBadge size="sm" state={form.status} provider={form.provider} locality={form.locality as never} /> : <View />}
      {form.confidence !== null && filledCount && !busy && !onUse ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{fillIn(labels.filledCount, { count: filledCount, total })}</Text>
          {undoAllKey}
        </View>
      ) : null}
    </View>
  )
  const errorView = form.error ? (
    <Animated.View entering={fade} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
      {renderIcon(icons.error, CircleAlert, { size: 16, strokeWidth: 1.75, color: t.colors.danger })}
      <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.danger }]}>{form.error.message}</Text>
      {form.error.kind !== 'refusal' ? <Button title={labels.retry} size="sm" variant="ghost" onPress={submit} /> : null}
    </Animated.View>
  ) : null
  const empty = renderEmpty && !busy && !form.error && !visible.length ? renderEmpty() : null

  if (presentation === 'card') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        {input}
        {thinking}
        {errorView}
        {empty}
        {Object.keys(form.values).length ? (
          <Animated.View entering={fade}>
            <Surface radius={cardRadius} style={[{ padding: z.pad, gap: 14 }, styles.fields]}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(form.values).map(([k, v]) => (v === undefined ? null : <Chip key={k} size={size === 'lg' ? 'md' : 'sm'} variant="soft" label={`${nameOf(k)}: ${displayValue(v)}`} ghost={(form.fields[k]?.confidence ?? 1) < unsure} />))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>{showBadge ? <OnDeviceBadge size="sm" state={form.status} provider={form.provider} locality={form.locality as never} /> : null}</View>
                {undoAllKey}
                <Button title={labels.use} variant="solid" size={z.key} onPress={useAll} />
              </View>
            </Surface>
          </Animated.View>
        ) : (
          footer
        )}
      </View>
    )
  }
  if (presentation === 'overlay') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        {input}
        {thinking}
        {errorView}
        {empty}
        {children ? children(form) : fieldsView}
        {footer}
      </View>
    )
  }
  if (composer) {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        {empty}
        {fieldsView}
        {errorView}
        {thinking}
        {input}
        {footer}
      </View>
    )
  }
  return (
    <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
      {input}
      {thinking}
      {errorView}
      {empty}
      {fieldsView}
      {footer}
    </View>
  )
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return String(value)
}

interface FieldRowProps extends SmartFieldRowProps {
  first: boolean
  confidenceStyle: 'highlight' | 'badge' | 'underline'
  z: Z
  icons: Partial<SmartInputIcons>
  labels: SmartInputLabels
  styles: Partial<SmartInputStyles>
}

function FieldRow({ first, label, value, missing, confidence, confidenceStyle, onChange, onConfirm, onUndo, z, icons, labels, styles }: FieldRowProps) {
  const t = useTheme()
  const s = useSkin()
  const [focused, setFocused] = useState(false)
  const [height, setHeight] = useState(0)
  // Blur waits a beat so a tap on the undo button lands before it hides.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (blurTimer.current && clearTimeout(blurTimer.current)), [])
  const filled = !missing && confidence < 1
  const low = filled && confidence < unsure
  const percent = Math.round(confidence * 100)
  const lineH = t.lineHeights[z.font]
  const vPad = Math.round((z.row - lineH) / 2)
  const meta = (() => {
    if (missing || !filled) return null
    if (confidenceStyle === 'badge') return <Text style={[typeStyle(t, 'xs', { mono: true }), { color: low ? t.colors.warning : t.colors.textTertiary }]}>{`${percent}%`}</Text>
    if (low) return <Chip size="sm" label={labels.confirm} icon={renderIcon(icons.confirm, Check, { size: 12, strokeWidth: 2, color: t.colors.textSecondary })} onPress={onConfirm} accessibilityLabel={`${labels.confirm}: ${label}`} />
    if (confidenceStyle === 'underline') return null
    const mark = renderIcon(icons.filled, CircleDashed, { size: 14, strokeWidth: 1.75, color: t.colors.textTertiary })
    return mark ? (
      <Pressable onPress={onConfirm} hitSlop={8} accessibilityRole="button" accessibilityLabel={fillIn(labels.filledMark, { percent, label })} style={({ pressed }) => ({ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
        {mark}
      </Pressable>
    ) : null
  })()
  const r = Math.max(8, s.radius.control - 2)
  return (
    <View style={[{ marginHorizontal: 4 }, styles.row]}>
      {first ? null : <View style={{ position: 'absolute', top: 0, left: 10, right: 10, height: hairlineWidth, backgroundColor: t.colors.hairline }} />}
      {/* The row being edited becomes the variant's key face: a keycap, a glossy pill, a steel plate. */}
      {focused ? <SkinRowFace radius={r} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: z.row, paddingLeft: z.pad - 4, paddingRight: 6, gap: 10 }}>
        <Text style={[typeStyle(t, z.label), { width: z.labelW, marginTop: vPad + (lineH - t.lineHeights[z.label]) / 2, color: t.colors.textSecondary }, styles.rowLabel]} numberOfLines={1}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 180)
          }}
          accessibilityLabel={label}
          placeholder={missing ? labels.add : undefined}
          multiline
          scrollEnabled={false}
          blurOnSubmit
          onContentSizeChange={(e) => {
            const h = Math.ceil(e.nativeEvent.contentSize.height)
            if (Math.abs(h - height) > 1) setHeight(h)
          }}
          placeholderTextColor={t.colors.textTertiary}
          selectionColor={s.tint}
          style={[typeStyle(t, z.font), { flex: 1, minWidth: 0, color: t.colors.text, marginVertical: vPad, paddingVertical: 0, paddingTop: 0, height: Math.max(lineH, height), outlineStyle: 'none', resize: 'none' } as never, styles.rowValue]}
        />
        {meta ? <View style={{ minHeight: z.row, justifyContent: 'center', maxHeight: z.row }}>{meta}</View> : null}
        {!missing && filled && focused && icons.undo !== null ? (
          <View style={{ minHeight: z.row, justifyContent: 'center' }}>
            <Button variant="ghost" size="sm" icon={keyIcon(icons.undo, RotateCcw)} onPress={onUndo} accessibilityLabel={`${labels.undo} ${label}`} />
          </View>
        ) : null}
      </View>
      {confidenceStyle === 'underline' && filled ? (
        <View style={{ position: 'absolute', left: z.pad - 4, bottom: 2, height: 2, borderRadius: 1, width: `${Math.round(confidence * 60)}%` as never, backgroundColor: low ? t.colors.warning : s.tint, opacity: low ? 1 : 0.55 }} />
      ) : null}
    </View>
  )
}

export default SmartInput
