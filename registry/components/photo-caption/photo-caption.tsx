import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Check, Copy, ImageIcon, ImagePlus, RefreshCw, RotateCcw, ScanEye, Sparkles } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type OndaiError } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { SkinTile, skinHasWells, Surface } from '../surface/surface'
import type { CaptionTone } from './prompts'
import { usePhotoCaption, type CaptionImage, type UsePhotoCaptionOptions } from './use-photo-caption'

/** Every icon PhotoCaption draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface PhotoCaptionIcons {
  /** The tile in the empty state. */
  empty: IconInput
  camera: IconInput
  library: IconInput
  /** The describe key. */
  run: IconInput
  /** Copy an output, and its confirmation. */
  copy: IconInput
  copied: IconInput
  /** The use-as-alt-text key. */
  useAlt: IconInput
  /** Describe again. */
  again: IconInput
  retry: IconInput
}

/** Every string PhotoCaption shows or announces. `{count}` and `{max}` are filled in. */
export interface PhotoCaptionLabels {
  caption: string
  alt: string
  empty: string
  idle: string
  takePhoto: string
  choosePhoto: string
  run: string
  thinking: string
  writingCaption: string
  writingAlt: string
  /** Alt text length, e.g. `92/125`. */
  count: string
  /** Under alt text that is longer than screen readers like. */
  tooLong: string
  copy: string
  copied: string
  useAlt: string
  usedAlt: string
  again: string
  retry: string
  error: string
  preparing: string
  /** Screen reader name of the photo before it has alt text. */
  photo: string
  changePhoto: string
}

export interface PhotoCaptionStyles {
  container: StyleProp<ViewStyle>
  photo: StyleProp<ViewStyle>
  /** The empty state. */
  empty: StyleProp<ViewStyle>
  /** One output block (caption or alt), its label and its text. */
  field: StyleProp<ViewStyle>
  fieldLabel: StyleProp<TextStyle>
  text: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const photoCaptionLabels: PhotoCaptionLabels = {
  caption: 'Caption',
  alt: 'Alt text',
  empty: 'Add a photo',
  idle: 'A caption and alt text, written on this device.',
  takePhoto: 'Take photo',
  choosePhoto: 'Choose photo',
  run: 'Describe photo',
  thinking: 'Looking at the photo',
  writingCaption: 'Writing the caption',
  writingAlt: 'Writing the alt text',
  count: '{count}/{max}',
  tooLong: 'Screen readers do best under {max} characters.',
  copy: 'Copy',
  copied: 'Copied',
  useAlt: 'Use as alt text',
  usedAlt: 'Alt text set',
  again: 'Describe again',
  retry: 'Try again',
  error: 'Couldn’t describe this photo',
  preparing: 'Preparing model',
  photo: 'The photo to describe',
  changePhoto: 'Choose another photo',
}

export type CaptionOutput = 'caption' | 'alt'

/** What a custom output block gets. */
export interface CaptionFieldProps {
  kind: CaptionOutput
  label: string
  value: string
  streaming: boolean
  editable: boolean
  onChange: (text: string) => void
  copy: () => void
}

/** What a custom empty state gets. */
export interface CaptionEmptyProps {
  openCamera: () => void
  openLibrary: () => void
}

export interface PhotoCaptionProps extends UsePhotoCaptionOptions {
  /** The photo to describe. Leave out to let the user take or choose one. */
  image?: CaptionImage
  /** `stacked` shows the caption and the alt text together; `tabs` shows one at a time with a toggle. */
  presentation?: 'stacked' | 'tabs'
  /** With `tabs`: which output shows first. */
  defaultOutput?: CaptionOutput
  tone?: CaptionTone
  /**
   * The look: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`. Changes the card, the
   * photo frame, the empty tile and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the keys and the variant's glow. Defaults to the accent. */
  tint?: string
  /** Corner radius of the card. Defaults to the variant's. */
  radius?: number
  icons?: Partial<PhotoCaptionIcons>
  labels?: Partial<PhotoCaptionLabels>
  styles?: Partial<PhotoCaptionStyles>
  /** Alt text longer than this gets a gentle note (default 125). */
  maxAltLength?: number
  /** The outputs can be edited once written (default true). */
  editable?: boolean
  /** Take or choose a photo from the empty state, and tap the photo to change it (default true). */
  allowPick?: boolean
  /** Describe as soon as there is a photo and a model (default true). */
  autoRun?: boolean
  showBadge?: boolean
  /** Use-as-alt-text and describe-again keys under finished outputs. */
  showActions?: boolean
  /** Called with the (possibly edited) alt text when "Use as alt text" is pressed. */
  onUseAlt?: (alt: string) => void
  /** Called after every hand edit. */
  onChange?: (result: { caption: string; alt: string }) => void
  /** Called when the user picks a new photo. */
  onImage?: (image: CaptionImage) => void
  renderEmpty?: (props: CaptionEmptyProps) => ReactNode
  renderField?: (props: CaptionFieldProps) => ReactNode
  /** Draw an error yourself. `retry` is undefined for a refusal. */
  renderError?: (error: OndaiError, retry?: () => void) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<PhotoCaptionProps['size']>
const sizes: Record<Size, { photo: number; body: FontSizeKey; label: FontSizeKey; key: 'sm' | 'md'; pad: number; gap: number; tile: number; icon: number }> = {
  sm: { photo: 148, body: 'sm', label: 'xs', key: 'sm', pad: 12, gap: 10, tile: 40, icon: 14 },
  md: { photo: 184, body: 'md', label: 'xs', key: 'sm', pad: 14, gap: 12, tile: 46, icon: 15 },
  lg: { photo: 224, body: 'lg', label: 'sm', key: 'md', pad: 18, gap: 14, tile: 54, icon: 17 },
}
type Z = (typeof sizes)[Size]

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
/** A key icon: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/**
 * A photo in, a caption and accessibility alt text out, written by the on-device vision model. Both stream in,
 * both can be edited, copied, and the alt text handed back to your app.
 */
export function PhotoCaption({ variant, tint, ...props }: PhotoCaptionProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <PhotoCaptionInner {...props} />
    </SkinProvider>
  )
}

function PhotoCaptionInner({
  image: imageProp,
  presentation = 'stacked',
  defaultOutput = 'caption',
  tone = 'plain',
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  maxAltLength = 125,
  editable = true,
  allowPick = true,
  autoRun = true,
  showBadge = true,
  showActions = true,
  onUseAlt,
  onChange,
  onImage,
  renderEmpty,
  renderField,
  renderError,
  style,
  testID,
  ...hookOptions
}: Omit<PhotoCaptionProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: PhotoCaptionLabels = { ...photoCaptionLabels, ...labelsProp }
  const pc = usePhotoCaption({ ...hookOptions, tone })
  const model = useLocalModel('vision')
  const [image, setImage] = useState<CaptionImage | null>(imageProp ?? null)
  const [tab, setTab] = useState<CaptionOutput>(defaultOutput)
  const [copied, setCopied] = useState<CaptionOutput | null>(null)
  const [used, setUsed] = useState(false)
  const ran = useRef<string | null>(null)

  useEffect(() => {
    if (imageProp && imageProp.uri !== image?.uri) setImage(imageProp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageProp?.uri])
  useEffect(() => {
    if (!autoRun || !image || ran.current === image.uri || !model.isReady) return
    ran.current = image.uri
    setUsed(false)
    void pc.run(image).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image?.uri, autoRun, model.isReady, tone])
  useEffect(() => {
    if (pc.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [pc.status])
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(null), 1600)
    return () => clearTimeout(id)
  }, [copied])
  // While streaming in tabs, follow the output being written.
  useEffect(() => {
    if (presentation === 'tabs' && pc.writing) setTab(pc.writing)
  }, [presentation, pc.writing])

  const unavailable = model.availability && model.availability.status !== 'ready'
  const busy = pc.isBusy
  const streaming = pc.status === 'streaming'
  const done = pc.status === 'done' && !!(pc.caption || pc.alt)
  const retryable = !!pc.error && pc.error.kind !== 'refusal'
  const run = () => {
    if (!image) return
    setUsed(false)
    void pc.run(image).catch(() => {})
  }
  const pick = async (camera: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true })
    const asset = res.canceled ? null : res.assets?.[0]
    if (!asset) return
    const img: CaptionImage = { uri: asset.uri, base64: asset.base64 ?? undefined, mimeType: asset.mimeType ?? undefined, width: asset.width, height: asset.height }
    pc.reset()
    setImage(img)
    onImage?.(img)
    if (!autoRun) return
    ran.current = img.uri
    if (model.isReady) void pc.run(img).catch(() => {})
  }
  const copy = (kind: CaptionOutput) => {
    void Haptics.selectionAsync().catch(() => {})
    void Clipboard.setStringAsync(kind === 'caption' ? pc.caption : pc.alt)
      .then(() => setCopied(kind))
      .catch(() => {})
  }
  const edit = (kind: CaptionOutput, text: string) => {
    if (kind === 'caption') pc.setCaption(text)
    else pc.setAlt(text)
    setUsed(false)
    onChange?.({ caption: kind === 'caption' ? text : pc.caption, alt: kind === 'alt' ? text : pc.alt })
  }
  const useAlt = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setUsed(true)
    onUseAlt?.(pc.alt)
  }

  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const wells = skinHasWells(s.skin)
  const secondary = wells || s.skin === 'shine' ? 'raised' : 'ghost'
  const r = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container)

  const field = (kind: CaptionOutput) => {
    const value = kind === 'caption' ? pc.caption : pc.alt
    const live = streaming && pc.writing === kind
    const props: CaptionFieldProps = { kind, label: kind === 'caption' ? labels.caption : labels.alt, value, streaming: live, editable: editable && done, onChange: (v) => edit(kind, v), copy: () => copy(kind) }
    if (renderField) return <View key={kind}>{renderField(props)}</View>
    return <CaptionField key={kind} {...props} z={z} labels={labels} max={maxAltLength} copied={copied === kind} showCopy={done} icons={icons} pending={streaming && !value} styles={styles} hideLabel={presentation === 'tabs'} />
  }

  const outputs =
    presentation === 'tabs' ? (
      <View style={{ gap: z.gap }}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
          {(['caption', 'alt'] as const).map((k) => (
            <Button key={k} title={k === 'caption' ? labels.caption : labels.alt} size="sm" variant={tab === k ? (wells ? 'raised' : 'soft') : 'ghost'} onPress={() => setTab(k)} accessibilityLabel={k === 'caption' ? labels.caption : labels.alt} />
          ))}
        </View>
        {field(tab)}
      </View>
    ) : (
      <View style={{ gap: z.gap + 2 }}>
        {field('caption')}
        {field('alt')}
      </View>
    )

  const body = unavailable && model.availability ? (
    model.availability.status === 'preparing' ? (
      <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label={labels.preparing} />
    ) : (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(model.availability).title}</Text>
    )
  ) : pc.status === 'thinking' ? (
    <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
      <ShimmerText size="sm" active>
        {labels.thinking}
      </ShimmerText>
      <Skeleton lines={2} height={10} radius={5} style={{ paddingVertical: 2 }} />
    </View>
  ) : pc.error ? (
    <Animated.View entering={fade} style={{ gap: 2 }}>
      {renderError ? (
        renderError(pc.error, retryable ? run : undefined)
      ) : (
        <>
          {retryable ? <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.danger }]}>{labels.error}</Text> : null}
          <Text style={[typeStyle(t, retryable ? 'xs' : 'sm'), { color: retryable ? t.colors.textTertiary : t.colors.textSecondary }]} numberOfLines={3}>
            {pc.error.message}
          </Text>
        </>
      )}
    </Animated.View>
  ) : streaming || pc.caption || pc.alt ? (
    <Animated.View entering={fade}>{outputs}</Animated.View>
  ) : image ? (
    <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{labels.idle}</Text>
  ) : null

  const idleWithPhoto = !!image && !busy && !pc.caption && !pc.alt && !pc.error && !unavailable
  const footerKeys = idleWithPhoto ? (
    <Button title={labels.run} variant="solid" size={z.key} icon={keyIcon(icons.run, Sparkles)} onPress={run} />
  ) : retryable && !renderError ? (
    <Button title={labels.retry} variant="outline" size={z.key} icon={keyIcon(icons.retry, RefreshCw)} onPress={run} />
  ) : done && showActions ? (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Button variant={secondary} size={z.key} icon={keyIcon(icons.again, RotateCcw)} title={icons.again === null ? labels.again : undefined} accessibilityLabel={labels.again} onPress={run} />
      <Button title={used ? labels.usedAlt : labels.useAlt} variant="solid" size={z.key} icon={used ? keyIcon(icons.copied, Check) : keyIcon(icons.useAlt, ScanEye)} onPress={useAlt} disabled={!pc.alt.trim()} testID={testID ? `${testID}-use-alt` : undefined} />
    </View>
  ) : null

  const emptyProps: CaptionEmptyProps = { openCamera: () => void pick(true), openLibrary: () => void pick(false) }
  const photo = image ? (
    <Pressable onPress={allowPick && !busy ? () => void pick(false) : undefined} disabled={!allowPick || busy} accessibilityRole={allowPick ? 'button' : 'image'} accessibilityLabel={allowPick && !busy ? labels.changePhoto : undefined}>
      <Photo image={image} height={z.photo} radius={Math.max(8, r - 6)} busy={busy} a11y={pc.alt && done ? pc.alt : labels.photo} style={styles.photo} />
    </Pressable>
  ) : renderEmpty ? (
    renderEmpty(emptyProps)
  ) : (
    <Empty {...emptyProps} z={z} labels={labels} icons={icons} allowPick={allowPick} style={styles.empty} />
  )

  return (
    <View style={[{ gap: 12 }, style]} testID={testID}>
      <Surface radius={r} style={[{ padding: z.pad, gap: z.gap + 2 }, styles.container]}>
        {photo}
        {body}
        {(showBadge || footerKeys) && !unavailable ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }, styles.footer]}>
            {showBadge ? <OnDeviceBadge size="sm" state={pc.status} provider={pc.provider} locality={pc.locality as never} /> : <View />}
            {footerKeys}
          </View>
        ) : null}
      </Surface>
    </View>
  )
}

/** One output: a label row (with the alt text's length and a copy key), then the streaming or editable text. */
function CaptionField({
  kind,
  label,
  value,
  streaming,
  editable,
  onChange,
  copy,
  z,
  labels,
  max,
  copied,
  showCopy,
  icons,
  pending,
  styles,
  hideLabel,
}: CaptionFieldProps & { z: Z; labels: PhotoCaptionLabels; max: number; copied: boolean; showCopy: boolean; icons: Partial<PhotoCaptionIcons>; pending: boolean; styles: Partial<PhotoCaptionStyles>; hideLabel: boolean }) {
  const t = useTheme()
  const long = kind === 'alt' && value.length > max
  const text = typeStyle(t, z.body)
  const copyIcon = renderIcon(copied ? icons.copied : icons.copy, copied ? Check : Copy, { size: 14, strokeWidth: 1.9, color: copied ? t.colors.text : t.colors.textTertiary })
  return (
    <View style={[{ gap: 4 }, styles.field]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 }}>
        <Text style={[typeStyle(t, z.label, { weight: 'medium' }), { color: t.colors.textSecondary, flex: 1 }, styles.fieldLabel]} numberOfLines={1}>
          {hideLabel ? '' : label}
        </Text>
        {kind === 'alt' && value ? (
          <Text style={[typeStyle(t, 'xs'), { color: long ? t.colors.warning : t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{fill(labels.count, { count: value.length, max })}</Text>
        ) : null}
        {showCopy && copyIcon ? (
          <Pressable onPress={copy} hitSlop={8} accessibilityRole="button" accessibilityLabel={copied ? labels.copied : `${labels.copy} ${label.toLowerCase()}`} style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
            {copyIcon}
          </Pressable>
        ) : null}
      </View>
      {pending ? (
        <Skeleton lines={kind === 'alt' ? 2 : 1} height={10} radius={5} style={{ paddingVertical: 4 }} />
      ) : editable ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline
          scrollEnabled={false}
          accessibilityLabel={label}
          placeholderTextColor={t.colors.textTertiary}
          style={[text, { color: t.colors.text, padding: 0, margin: 0, textAlignVertical: 'top' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null, styles.text]}
        />
      ) : (
        <StreamingText text={value} streaming={streaming} size={z.body} color={t.colors.text} style={styles.text} />
      )}
      {long ? <Text style={[typeStyle(t, 'xs'), { color: t.colors.warning }]}>{fill(labels.tooLong, { max })}</Text> : null}
    </View>
  )
}

/** The photo in the variant's frame; quiet looks show it bare. Dimmed a little while the model looks at it. */
function Photo({ image, height, radius, busy, a11y, style }: { image: CaptionImage; height: number; radius: number; busy: boolean; a11y: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const s = useSkin()
  const framed = s.skin !== 'clean' && s.skin !== 'minimal'
  const inset = framed ? 4 : 0
  const shot = (
    <View style={{ height, borderRadius: radius - inset, overflow: 'hidden', backgroundColor: t.colors.muted }}>
      <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={a11y} accessible />
      {busy ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.16)' }]} /> : null}
    </View>
  )
  if (!framed) return <View style={style}>{shot}</View>
  return (
    <Surface elevation="inset" radius={radius} style={[{ padding: inset }, style]}>
      {shot}
    </Surface>
  )
}

/** No photo yet: a tile in the variant, a title, and two ways in. */
function Empty({ openCamera, openLibrary, z, labels, icons, allowPick, style }: CaptionEmptyProps & { z: Z; labels: PhotoCaptionLabels; icons: Partial<PhotoCaptionIcons>; allowPick: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const s = useSkin()
  const wells = skinHasWells(s.skin)
  const tileIcon = renderIcon(icons.empty, ImagePlus, { size: Math.round(z.tile * 0.46), strokeWidth: 1.75, color: wells ? s.tile.ink : t.colors.text })
  return (
    <View style={[{ minHeight: z.photo, alignItems: 'center', justifyContent: 'center', gap: 12 }, style]}>
      {tileIcon ? wells ? <SkinTile size={z.tile}>{tileIcon}</SkinTile> : tileIcon : null}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[typeStyle(t, 'md', { weight: 'semibold' }), { color: t.colors.text, textAlign: 'center' }]}>{labels.empty}</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, textAlign: 'center' }]}>{labels.idle}</Text>
      </View>
      {allowPick ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title={labels.takePhoto} variant="solid" size={z.key} icon={keyIcon(icons.camera, Camera)} onPress={openCamera} />
          <Button title={labels.choosePhoto} variant="ghost" size={z.key} icon={keyIcon(icons.library, ImageIcon)} onPress={openLibrary} />
        </View>
      ) : null}
    </View>
  )
}

export default PhotoCaption
