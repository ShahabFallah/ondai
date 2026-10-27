import { useEffect, useRef, useState } from 'react'
import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Camera, Check, ImageIcon, RotateCcw, ScanLine } from 'lucide-react-native'
import type { z } from 'zod'
import { humanize } from '@ondai/core'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Field } from '../field/field'
import { IonBorder } from '../ion-border/ion-border'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Skeleton } from '../skeleton/skeleton'
import { useScanToData, type ScanImage, type UseScanToDataOptions } from './use-scan-to-data'

export interface ScanToDataProps<S extends z.ZodObject<z.ZodRawShape>> extends UseScanToDataOptions<S> {
  presentation?: 'camera' | 'picker' | 'card'
  onData?: (data: Partial<z.infer<S>>) => void
  labels?: Record<string, string>
  /** Pre-supplied image (playground / deep links). */
  initialImage?: ScanImage
  /** Pre-supplied OCR text (skips OCR). */
  initialText?: string
  autoRun?: boolean
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Camera or photo becomes structured data: a scanning frame with an ion edge sweep, a picker, or a result card. */
export function ScanToData<S extends z.ZodObject<z.ZodRawShape>>({ presentation = 'camera', onData, labels, initialImage, initialText, autoRun = false, showBadge = true, style, testID, ...hookOptions }: ScanToDataProps<S>) {
  const t = useTheme()
  const motion = useMotion()
  const sc = useScanToData(hookOptions)
  const [image, setImage] = useState<ScanImage | null>(initialImage ?? null)
  const ran = useRef(false)
  const busy = sc.phase === 'ocr' || sc.phase === 'extract'
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

  const sweep = useSharedValue(0)
  useEffect(() => {
    if (busy && motion.enabled) {
      sweep.value = 0
      sweep.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true)
    } else cancelAnimation(sweep)
    return () => cancelAnimation(sweep)
  }, [busy, motion.enabled, sweep])
  const sweepStyle = useAnimatedStyle(() => ({ top: `${sweep.value * 100}%` }), [sweep])

  const pick = async (camera: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true })
    const asset = res.canceled ? null : res.assets?.[0]
    if (!asset) return
    const img: ScanImage = { uri: asset.uri, base64: asset.base64 ?? undefined, width: asset.width, height: asset.height }
    setImage(img)
    void sc.scan(img).then(onData).catch(() => {})
  }

  const result = sc.data ? (
    <Animated.View entering={motion.enabled ? FadeInDown.duration(220) : undefined}>
      <IonBorder active={false} radius="lg">
        <View style={{ padding: 14, gap: 10 }}>
          {sc.fieldInfo.map((f) => {
            const v = (sc.data as Record<string, unknown>)?.[f.name]
            if (v === undefined) return null
            const conf = sc.fields[f.name]?.confidence ?? 1
            return <Field key={f.name} label={labels?.[f.name] ?? humanize(f.name)} value={String(v)} editable={false} confidence={conf} confidenceStyle="badge" />
          })}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Button title="Rescan" variant="ghost" size="sm" icon={<RotateCcw size={14} strokeWidth={1.5} color={t.colors.textSecondary} />} onPress={() => (sc.reset(), setImage(null))} />
            <Button title="Use" variant="solid" size="sm" icon={<Check size={14} strokeWidth={1.75} color={t.colors.bg} />} onPress={() => sc.data && onData?.(sc.data)} />
          </View>
        </View>
      </IonBorder>
    </Animated.View>
  ) : null
  const status = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {showBadge ? <OnDeviceBadge size="sm" state={busy ? 'thinking' : sc.status} provider={sc.provider} locality={sc.locality as never} /> : <View />}
      <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{sc.phase === 'ocr' ? 'reading text…' : sc.phase === 'extract' ? 'extracting…' : sc.ocrAvailable ? 'ocr on device' : 'ocr not configured'}</Text>
    </View>
  )
  const error = sc.error ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{sc.error.message}</Text> : null

  if (presentation === 'card') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        {busy ? <Skeleton lines={4} height={14} /> : result}
        {error}
        {status}
      </View>
    )
  }
  if (presentation === 'picker') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Choose photo" variant="soft" icon={<ImageIcon size={16} strokeWidth={1.5} color={t.colors.text} />} onPress={() => void pick(false)} loading={busy} />
          <Button title="Camera" variant="outline" icon={<Camera size={16} strokeWidth={1.5} color={t.colors.text} />} onPress={() => void pick(true)} disabled={busy} />
        </View>
        {image ? <Image source={{ uri: image.uri }} style={{ width: '100%', height: 160, borderRadius: t.radii.md }} resizeMode="cover" accessibilityLabel="Selected photo" /> : null}
        {busy ? <Skeleton lines={3} height={14} /> : result}
        {error}
        {status}
      </View>
    )
  }
  return (
    <View style={[{ gap: 12 }, style]} testID={testID}>
      <IonBorder active={busy} radius="xl" glow={busy}>
        <Pressable onPress={() => void pick(true)} disabled={busy} accessibilityRole="button" accessibilityLabel={busy ? 'Scanning' : undefined} style={{ height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: t.colors.bg }}>
          {image ? <Image source={{ uri: image.uri }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 } as never} resizeMode="cover" /> : null}
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ position: 'absolute', width: 22, height: 22, borderColor: busy ? t.colors.accent.solid : t.colors.textTertiary, borderTopWidth: i < 2 ? 1.5 : 0, borderBottomWidth: i >= 2 ? 1.5 : 0, borderLeftWidth: i % 2 === 0 ? 1.5 : 0, borderRightWidth: i % 2 === 1 ? 1.5 : 0, top: i < 2 ? 18 : undefined, bottom: i >= 2 ? 18 : undefined, left: i % 2 === 0 ? 18 : undefined, right: i % 2 === 1 ? 18 : undefined }} />
          ))}
          {busy ? <Animated.View style={[{ position: 'absolute', left: 18, right: 18, height: 2, backgroundColor: t.colors.accent.solid, opacity: 0.9 }, sweepStyle]} /> : null}
          {!busy ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ScanLine size={22} strokeWidth={1.5} color={t.colors.textSecondary} />
              <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{image ? 'Tap to scan again' : `Scan a ${humanize(hookOptions.preset ?? 'receipt').toLowerCase()}`}</Text>
            </View>
          ) : null}
        </Pressable>
      </IonBorder>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Photo library" variant="ghost" size="sm" icon={<ImageIcon size={14} strokeWidth={1.5} color={t.colors.textSecondary} />} onPress={() => void pick(false)} disabled={busy} />
      </View>
      {busy && sc.phase === 'extract' ? <Skeleton lines={3} height={14} /> : result}
      {error}
      {status}
    </View>
  )
}

export default ScanToData
