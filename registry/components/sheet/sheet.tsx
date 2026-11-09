import { useEffect, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useMotion, useTheme } from '@ondai/tokens/react'
import { Surface } from '../surface/surface'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** `sheet` slides up from the bottom; `spotlight` floats centered (⌘K style); `fullscreen` fills. */
  presentation?: 'sheet' | 'spotlight' | 'fullscreen'
  /** `auto` follows the theme material; `glass` and `solid` force one. Glass also blurs the page behind. */
  variant?: 'auto' | 'glass' | 'solid'
  /** Render inline (no Modal) for the web playground and embedded previews. */
  inline?: boolean
  /** Show the small drag handle on bottom sheets. Default true. */
  grabber?: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
  /** Max width of the spotlight panel. */
  maxWidth?: number
}

/** Animated container used by CommandBar, ToolConfirmCard and sheet presentations. Springs in over a soft scrim. */
export function Sheet({ open, onClose, presentation = 'sheet', variant = 'auto', inline, grabber = true, children, style, testID, maxWidth = 560 }: SheetProps) {
  const t = useTheme()
  const motion = useMotion()
  const { height } = useWindowDimensions()
  const [mounted, setMounted] = useState(open)
  const progress = useSharedValue(open ? 1 : 0)

  useEffect(() => {
    if (open) {
      setMounted(true)
      progress.value = motion.enabled ? withSpring(1, t.springs.smooth) : 1
    } else if (motion.enabled) {
      progress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setMounted)(false)
      })
    } else {
      progress.value = 0
      setMounted(false)
    }
  }, [open, motion.enabled, progress, t.springs.smooth])

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }), [progress])
  const panel = useAnimatedStyle(
    () =>
      presentation === 'sheet'
        ? { transform: [{ translateY: (1 - progress.value) * Math.min(height, 600) }] }
        : presentation === 'spotlight'
          ? { opacity: progress.value, transform: [{ scale: 0.97 + progress.value * 0.03 }, { translateY: (1 - progress.value) * -6 }] }
          : { opacity: progress.value },
    [progress, presentation, height],
  )

  if (!mounted) return null
  const dark = t.scheme === 'dark'
  const material = variant === 'auto' ? 'auto' : variant
  const glass = variant === 'glass' || (variant === 'auto' && t.glass)
  const radius = presentation === 'sheet' ? t.radii.xl : t.radii.lg + 2
  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]} pointerEvents={open ? 'auto' : 'none'}>
        {glass && Platform.OS !== 'web' ? <BlurView intensity={12} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.5)' : 'rgba(9,9,11,0.2)' }]} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, presentation === 'spotlight' ? styles.centerTop : presentation === 'sheet' ? styles.bottom : null]} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            presentation === 'sheet'
              ? { borderTopLeftRadius: t.radii.xl, borderTopRightRadius: t.radii.xl, paddingBottom: 20, maxHeight: height * 0.9 }
              : presentation === 'spotlight'
                ? { width: '100%', maxWidth, borderRadius: radius, marginTop: Math.max(64, height * 0.1) }
                : { flex: 1 },
            presentation === 'fullscreen' && { backgroundColor: t.colors.bg },
            panel,
            style,
          ]}
        >
          {presentation === 'fullscreen' ? null : <Surface pointerEvents="none" material={material} elevation="floating" radius={radius} style={StyleSheet.absoluteFill} />}
          {presentation === 'sheet' && grabber ? (
            <View style={styles.grabberWrap}>
              <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
  if (inline) return content
  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      {content}
    </Modal>
  )
}

const styles = StyleSheet.create({
  bottom: { justifyContent: 'flex-end' },
  centerTop: { alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12 },
  grabberWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
})

export default Sheet
