import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Camera, Check, CircleAlert, ImageIcon, RotateCcw, ScanLine, ScanText } from 'lucide-react-native'
import type { z } from 'zod'
import { humanize } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinTile, skinHasWells, Surface } from '../surface/surface'
import { useScanToData, type ScanImage, type UseScanToDataOptions } from './use-scan-to-data'

/** Every icon ScanToData draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface ScanToDataIcons {
  /** The tile in the empty viewfinder. */
  scan: IconInput
  /** On the take-photo key. */
  camera: IconInput
  /** On the choose-photo key. */
  library: IconInput
  /** While the photo is read. */
  reading: IconInput
  /** While the fields are found. */
  finding: IconInput
  /** A finished step and the result's header. */
  done: IconInput
  error: IconInput
  /** On the retake tag and the scan-again key. */
  retake: IconInput
}

/** Every string ScanToData shows or announces. `{subject}`, `{count}`, `{field}` and `{fields}` are replaced where they appear. */
export interface ScanToDataLabels {
  /** What is being scanned. Empty means the preset's name ("receipt", "business card"). */
  subject: string
  scan: string
  /** Under the viewfinder's title. */
  scanHint: string
  takePhoto: string
  choosePhoto: string
  noOcr: string
  reading: string
  read: string
  /** When text was given instead of a photo. */
  gotText: string
  lines: string
  finding: string
  findingMany: string
  /** After the first three field names. */
  andMore: string
  found: string
  foundOne: string
  fromYour: string
  /** After a value the model was unsure of. */
  check: string
  scanAgain: string
  use: string
  retake: string
  error: string
  /** Screen reader names for the photo. */
  scanning: string
  scanAnother: string
}

export interface ScanToDataStyles {
  container: StyleProp<ViewStyle>
  /** The empty viewfinder. */
  empty: StyleProp<ViewStyle>
  photo: StyleProp<ViewStyle>
  /** The card of values. */
  result: StyleProp<ViewStyle>
  row: StyleProp<ViewStyle>
  rowLabel: StyleProp<TextStyle>
  rowValue: StyleProp<TextStyle>
  actions: StyleProp<ViewStyle>
}

export const scanToDataLabels: ScanToDataLabels = {
  subject: '',
  scan: 'Scan a {subject}',
  scanHint: 'Read on this device. The photo never leaves it.',
  takePhoto: 'Take photo',
  choosePhoto: 'Choose photo',
  noOcr: 'Connect an OCR provider to read photos.',
  reading: 'Reading the {subject}',
  read: 'Read the {subject}',
  gotText: 'Got the text',
  lines: '{count} lines',
  finding: 'Finding the {field}',
  findingMany: 'Finding {fields}',
  andMore: 'and more',
  found: 'Found {count} details',
  foundOne: 'Found 1 detail',
  fromYour: 'from your {subject}',
  check: 'check this',
  scanAgain: 'Scan again',
  use: 'Use these',
  retake: 'Retake',
  error: 'Couldn’t read that {subject}',
  scanning: 'Scanning the {subject}',
  scanAnother: 'Scan another {subject}',
}

/** What a custom empty viewfinder gets. */
export interface ScanEmptyProps {
  subject: string
  /** An OCR provider is connected, so photos can be read. */
  ocr: boolean
  openCamera: () => void
  openLibrary: () => void
}

/** What a custom value row gets. */
export interface ScanRowProps {
  name: string
  label: string
  value: string
  /** 0 to 1. */
  confidence: number
}

/** What a custom result or use key gets. */
export interface ScanResultProps<T> {
  data: Partial<T>
  rescan: () => void
  use: () => void
}

export interface ScanToDataProps<S extends z.ZodObject<z.ZodRawShape>> extends UseScanToDataOptions<S> {
  presentation?: 'camera' | 'picker' | 'card'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the viewfinder,
   * the photo frame, the card of values and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the keys, the viewfinder corners and the scan line. Defaults to the accent. */
  tint?: string
  /** Corner radius of the viewfinder, the photo and the card. Defaults to the variant's. */
  radius?: number
  icons?: Partial<ScanToDataIcons>
  /** Replace any visible or announced string. (Field names go in `fieldLabels`.) */
  labels?: Partial<ScanToDataLabels>
  /** How each field is named: `{ total: 'Amount' }`. Defaults to the humanized key. */
  fieldLabels?: Record<string, string>
  styles?: Partial<ScanToDataStyles>
  /** Called with the values after each scan, and again when "Use these" is pressed (unless `onUse` is set). */
  onData?: (data: Partial<z.infer<S>>) => void
  /** Called when "Use these" is pressed. */
  onUse?: (data: Partial<z.infer<S>>) => void
  /** Draw the empty viewfinder yourself. */
  renderEmpty?: (props: ScanEmptyProps) => ReactNode
  /** Draw a value row yourself. */
  renderRow?: (props: ScanRowProps) => ReactNode
  /** Draw the whole result yourself. */
  renderResult?: (props: ScanResultProps<z.infer<S>>) => ReactNode
  /** Draw the "Use these" key yourself. */
  renderUse?: (props: ScanResultProps<z.infer<S>>) => ReactNode
  /** Pre-supplied image (playground / deep links). */
  initialImage?: ScanImage
  /** Pre-supplied OCR text (skips OCR). */
  initialText?: string
  autoRun?: boolean
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<ScanToDataProps<never>['size']>
const sizes: Record<Size, { frame: number; done: number; text: FontSizeKey; title: FontSizeKey; labelW: number; key: 'sm' | 'md' | 'lg'; tile: number; pad: number }> = {
  sm: { frame: 176, done: 112, text: 'sm', title: 'md', labelW: 76, key: 'sm', tile: 40, pad: 12 },
  md: { frame: 208, done: 132, text: 'sm', title: 'md', labelW: 84, key: 'sm', tile: 46, pad: 14 },
  lg: { frame: 248, done: 156, text: 'md', title: 'lg', labelW: 100, key: 'md', tile: 54, pad: 18 },
}
type Z = (typeof sizes)[Size]

/** Plain display: ISO timestamps become a date, everything else as text. */
const display = (v: unknown) => {
  const s = typeof v === 'string' ? v : String(v)
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const fillIn = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
/** A key icon: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/** Camera or photo becomes structured data: a viewfinder, a soft scan line while it reads, then a card of fields. */
export function ScanToData<S extends z.ZodObject<z.ZodRawShape>>({ variant, tint, ...props }: ScanToDataProps<S>) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Scan {...props} tinted={!!tint} />
    </SkinProvider>
  )
}

function Scan<S extends z.ZodObject<z.ZodRawShape>>({
  presentation = 'camera',
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  fieldLabels,
  styles = {},
  onData,
  onUse,
  renderEmpty,
  renderRow,
  renderResult,
  renderUse,
  initialImage,
  initialText,
  autoRun = false,
  showBadge = true,
  style,
  testID,
  tinted,
  ...hookOptions
}: Omit<ScanToDataProps<S>, 'variant' | 'tint'> & { tinted: boolean }) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const sc = useScanToData(hookOptions)
  const [image, setImage] = useState<ScanImage | null>(initialImage ?? null)
  const ran = useRef(false)
  const busy = sc.phase === 'ocr' || sc.phase === 'extract'
  const labels: ScanToDataLabels = { ...scanToDataLabels, ...labelsProp }
  const subject = labels.subject || humanize(hookOptions.preset && hookOptions.preset !== 'custom' ? hookOptions.preset : 'receipt').toLowerCase()
  const say = (key: keyof ScanToDataLabels, vars: Record<string, string | number> = {}) => fillIn(labels[key], { subject, ...vars })
  // Older apps passed field names in `labels`; they still work when no `fieldLabels` names that field.
  const legacy = (labelsProp ?? {}) as Record<string, string | undefined>
  const nameOf = (field: string) => fieldLabels?.[field] ?? (field in scanToDataLabels ? undefined : legacy[field]) ?? humanize(field)
  const r = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 4)
  useEffect(() => {
    if (!autoRun || ran.current) return
    ran.current = true
    if (initialText) void sc.scanText(initialText).then(onData).catch(() => {})
    else if (initialImage) void sc.scan(initialImage).then(onData).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])
  useEffect(() => {
    if (sc.phase === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [sc.phase])

  // While extracting, name the field being looked for, one at a time.
  const names = sc.fieldInfo.map((f) => nameOf(f.name).toLowerCase())
  const [step, setStep] = useState(0)
  useEffect(() => {
    setStep(0)
    if (sc.phase !== 'extract' || !motion.enabled || names.length < 2) return
    const id = setInterval(() => setStep((v) => v + 1), 1100)
    return () => clearInterval(id)
  }, [sc.phase, motion.enabled, names.length])

  const pick = async (camera: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true })
    const asset = res.canceled ? null : res.assets?.[0]
    if (!asset) return
    const img: ScanImage = { uri: asset.uri, base64: asset.base64 ?? undefined, width: asset.width, height: asset.height }
    setImage(img)
    void sc.scan(img).then(onData).catch(() => {})
  }
  const rescan = () => (sc.reset(), setImage(null))
  const use = () => {
    if (!sc.data) return
    ;(onUse ?? onData)?.(sc.data)
  }

  const sm = [typeStyle(t, z.text)]
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const lines = sc.ocrText.split('\n').filter((l) => l.trim()).length
  const quiet = { size: 16, strokeWidth: 1.75, color: t.colors.textTertiary }

  const trace = busy ? (
    <Animated.View entering={fade} style={{ gap: 8, paddingHorizontal: 2 }} accessibilityLiveRegion="polite">
      {sc.phase === 'ocr' ? (
        <TraceRow icon={renderIcon(icons.reading, ScanText, quiet)}>
          <ShimmerText size="sm" weight="regular">
            {say('reading')}
          </ShimmerText>
        </TraceRow>
      ) : (
        <>
          <TraceRow icon={renderIcon(icons.done, Check, { ...quiet, color: t.colors.textSecondary })}>
            <Text style={[sm, { color: t.colors.textSecondary }]}>
              {image ? say('read') : labels.gotText}
              <Text style={{ color: t.colors.textTertiary }}>{lines ? `  ${say('lines', { count: lines })}` : ''}</Text>
            </Text>
          </TraceRow>
          <TraceRow icon={renderIcon(icons.finding, ScanLine, quiet)}>
            <ShimmerText size="sm" weight="regular">
              {motion.enabled && names.length > 1 ? say('finding', { field: names[step % names.length]! }) : say('findingMany', { fields: `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` ${labels.andMore}` : ''}` })}
            </ShimmerText>
          </TraceRow>
        </>
      )}
    </Animated.View>
  ) : null

  const entries = sc.data ? sc.fieldInfo.filter((f) => (sc.data as Record<string, unknown>)[f.name] !== undefined) : []
  const resultProps: ScanResultProps<z.infer<S>> | null = sc.data ? { data: sc.data, rescan, use } : null
  const wells = skinHasWells(s.skin)
  const doneIcon = renderIcon(icons.done, Check, { size: wells ? 15 : 16, strokeWidth: 2, color: wells ? s.tile.ink : t.colors.text })
  const result = resultProps ? (
    <Animated.View entering={fade}>
      {renderResult ? (
        renderResult(resultProps)
      ) : (
        <Surface elevation="floating" radius={r} style={[{ padding: z.pad, gap: 12 }, styles.result]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {doneIcon ? wells ? <SkinTile size={26}>{doneIcon}</SkinTile> : <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.muted }}>{doneIcon}</View> : null}
            <Text style={[typeStyle(t, z.title, { weight: 'semibold' }), { color: t.colors.text, flexShrink: 1 }]} numberOfLines={1}>
              {entries.length === 1 ? labels.foundOne : say('found', { count: entries.length })}
              <Text style={[typeStyle(t, z.text), { color: t.colors.textTertiary }]}>{`  ${say('fromYour')}`}</Text>
            </Text>
          </View>
          <View style={{ gap: 0 }}>
            {entries.map((f, i) => {
              const row: ScanRowProps = { name: f.name, label: nameOf(f.name), value: display((sc.data as Record<string, unknown>)[f.name]), confidence: sc.fields[f.name]?.confidence ?? 1 }
              if (renderRow) return <View key={f.name}>{renderRow(row)}</View>
              return (
                <View key={f.name} style={[{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline }, styles.row]}>
                  <Text style={[sm, { color: t.colors.textSecondary, width: z.labelW }, styles.rowLabel]} numberOfLines={1}>
                    {row.label}
                  </Text>
                  <Text style={[sm, { color: t.colors.text, flex: 1 }, styles.rowValue]} numberOfLines={2}>
                    {row.value}
                    {row.confidence < 0.7 ? <Text style={{ color: t.colors.warning }}>{`  ${labels.check}`}</Text> : null}
                  </Text>
                </View>
              )
            })}
          </View>
          <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 12, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.actions]}>
            <Button title={labels.scanAgain} variant="ghost" size={z.key} icon={keyIcon(icons.retake, RotateCcw)} onPress={rescan} />
            {renderUse ? renderUse(resultProps) : <Button title={labels.use} variant="solid" size={z.key} onPress={use} testID={testID ? `${testID}-use` : undefined} />}
          </View>
        </Surface>
      )}
    </Animated.View>
  ) : null

  const error =
    sc.error && !busy ? (
      <Animated.View entering={fade} style={{ gap: 2, paddingHorizontal: 2 }}>
        <TraceRow icon={renderIcon(icons.error, CircleAlert, { ...quiet, color: t.colors.danger })}>
          <Text style={[sm, { color: t.colors.danger }]}>{say('error')}</Text>
        </TraceRow>
        <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, marginLeft: 24 }]} numberOfLines={2}>
          {sc.error.message}
        </Text>
      </Animated.View>
    ) : null

  const badge = showBadge ? <OnDeviceBadge size="sm" state={busy ? 'thinking' : sc.status} provider={sc.provider} locality={sc.locality as never} /> : null
  const photo = (height: number, retake: boolean) =>
    image ? <ScanPhoto image={image} busy={busy} height={height} radius={r} retake={retake ? labels.retake : undefined} retakeIcon={icons.retake} line={tinted ? s.tint : undefined} style={styles.photo} a11y={busy ? say('scanning') : retake ? `${labels.retake}: ${say('scanAnother')}` : say('scanAnother')} /> : null

  if (presentation === 'card') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        {trace}
        {result}
        {error}
        {badge}
      </View>
    )
  }
  if (presentation === 'picker') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={labels.choosePhoto} variant="solid" size={z.key === 'sm' ? 'md' : 'lg'} icon={keyIcon(icons.library, ImageIcon)} onPress={() => void pick(false)} disabled={busy || !sc.ocrAvailable} />
          <Button title={labels.takePhoto} variant="raised" size={z.key === 'sm' ? 'md' : 'lg'} icon={keyIcon(icons.camera, Camera)} onPress={() => void pick(true)} disabled={busy || !sc.ocrAvailable} />
        </View>
        {photo(z.frame - 40, false)}
        {trace}
        {result}
        {error}
        {badge}
      </View>
    )
  }

  const showFrame = image || (!busy && !sc.data)
  const emptyProps: ScanEmptyProps = { subject, ocr: sc.ocrAvailable, openCamera: () => void pick(true), openLibrary: () => void pick(false) }
  return (
    <View style={[{ gap: 14 }, style, styles.container]} testID={testID}>
      {showFrame ? (
        image ? (
          <Pressable onPress={() => void pick(true)} disabled={busy} accessibilityRole="button" accessibilityLabel={busy ? say('scanning') : `${labels.retake}: ${say('scanAnother')}`}>
            {photo(sc.data ? z.done : z.frame, !busy)}
          </Pressable>
        ) : renderEmpty ? (
          renderEmpty(emptyProps)
        ) : (
          <Viewfinder {...emptyProps} z={z} radius={r} labels={labels} say={say} icons={icons} style={styles.empty} />
        )
      ) : null}
      {trace}
      {result}
      {error}
      {badge}
    </View>
  )
}

/** The idle viewfinder: corner marks round a tile in the variant, a title, and two clear ways in. */
function Viewfinder({ ocr, openCamera, openLibrary, z, radius, labels, say, icons, style }: ScanEmptyProps & { z: Z; radius: number; labels: ScanToDataLabels; say: (k: keyof ScanToDataLabels) => string; icons: Partial<ScanToDataIcons>; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const s = useSkin()
  const wells = skinHasWells(s.skin)
  const tileIcon = renderIcon(icons.scan, ScanLine, { size: Math.round(z.tile * 0.46), strokeWidth: 1.75, color: wells ? s.tile.ink : t.colors.text })
  const corner = 14
  const mark = (pos: ViewStyle, sides: ViewStyle) => <View pointerEvents="none" style={[{ position: 'absolute', width: corner, height: corner, borderColor: t.colors.textTertiary }, pos, sides]} />
  const cr = Math.max(6, radius - 8)
  return (
    <Surface radius={radius} style={[{ minHeight: z.frame, padding: z.pad, alignItems: 'center', justifyContent: 'center', gap: 14 }, style]}>
      <View style={{ width: z.tile + 36, height: z.tile + 28, alignItems: 'center', justifyContent: 'center' }}>
        {mark({ left: 0, top: 0 }, { borderLeftWidth: 1.5, borderTopWidth: 1.5, borderTopLeftRadius: cr / 2 })}
        {mark({ right: 0, top: 0 }, { borderRightWidth: 1.5, borderTopWidth: 1.5, borderTopRightRadius: cr / 2 })}
        {mark({ left: 0, bottom: 0 }, { borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderBottomLeftRadius: cr / 2 })}
        {mark({ right: 0, bottom: 0 }, { borderRightWidth: 1.5, borderBottomWidth: 1.5, borderBottomRightRadius: cr / 2 })}
        {tileIcon ? wells ? <SkinTile size={z.tile}>{tileIcon}</SkinTile> : tileIcon : null}
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[typeStyle(t, z.title, { weight: 'semibold' }), { color: t.colors.text, textAlign: 'center' }]}>{say('scan')}</Text>
        <Text style={[typeStyle(t, z.text), { color: t.colors.textSecondary, textAlign: 'center' }]}>{ocr ? say('scanHint') : labels.noOcr}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={labels.takePhoto} variant="solid" size={z.key} icon={keyIcon(icons.camera, Camera)} onPress={openCamera} disabled={!ocr} />
        <Button title={labels.choosePhoto} variant="ghost" size={z.key} icon={keyIcon(icons.library, ImageIcon)} onPress={openLibrary} disabled={!ocr} />
      </View>
    </Surface>
  )
}

/** The captured photo in the variant's frame. While it reads, a soft band of light moves down it. */
function ScanPhoto({ image, busy, height, radius, retake, retakeIcon, line, style, a11y }: { image: ScanImage; busy: boolean; height: number; radius: number; retake?: string; retakeIcon?: IconInput; line?: string; style?: StyleProp<ViewStyle>; a11y: string }) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const y = useSharedValue(0.42)
  useEffect(() => {
    if (busy && motion.enabled) {
      y.value = 0
      y.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)
    } else {
      cancelAnimation(y)
      y.value = 0.42
    }
    return () => cancelAnimation(y)
  }, [busy, motion.enabled, y])
  const band = 64
  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -band + y.value * height }] }), [y, height])
  // Expressive looks hold the photo in their own frame (a keycap slab, a glossy card, a chrome rim); quiet ones show it bare.
  const framed = s.skin !== 'clean' && s.skin !== 'minimal'
  const inset = framed ? 5 : 0
  const glow = line ?? '#FFFFFF'
  const shot = (
    <View style={{ height, borderRadius: radius - inset, overflow: 'hidden', backgroundColor: t.colors.muted, borderWidth: framed ? 0 : hairlineWidth, borderColor: t.colors.hairline }}>
      <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={a11y} />
      {busy ? (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: band + 1 }, bandStyle]}>
            <Svg width="100%" height={band}>
              <Defs>
                <LinearGradient id="ondai-scan-band" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={glow} stopOpacity={0} />
                  <Stop offset="1" stopColor={glow} stopOpacity={0.2} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width="100%" height={band} fill="url(#ondai-scan-band)" />
            </Svg>
            <View style={[{ height: 1.5, backgroundColor: glow, boxShadow: `0 0 10px ${glow}` } as ViewStyle]} />
          </Animated.View>
        </>
      ) : null}
      {retake ? (
        <View style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          {renderIcon(retakeIcon, RotateCcw, { size: 12, strokeWidth: 2, color: '#FFFFFF' })}
          <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: '#FFFFFF' }]}>{retake}</Text>
        </View>
      ) : null}
    </View>
  )
  if (!framed) return <View style={style}>{shot}</View>
  return (
    <Surface radius={radius} style={[{ padding: inset }, style]}>
      {shot}
    </Surface>
  )
}

/** One step: a quiet 16px icon and a sentence. */
function TraceRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 }}>
      {icon ? <View style={{ width: 16, alignItems: 'center' }}>{icon}</View> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

export default ScanToData
