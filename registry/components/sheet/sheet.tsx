import { useEffect, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { hairlineWidth, useMotion, useTheme } from '@ondai/tokens/react'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** `sheet` slides up from the bottom; `spotlight` floats centered (⌘K style); `fullscreen` fills. */
  presentation?: 'sheet' | 'spotlight' | 'fullscreen'
  /** `glass` blurs the backdrop and uses translucent surface; `solid` uses the theme surface. */
  variant?: 'glass' | 'solid'
  /** Render inline (no Modal) for the web playground and embedded previews. */
  inline?: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
  /** Max width of the spotlight panel. */
  maxWidth?: number
}

/** Animated container used by CommandBar, ToolConfirmCard and sheet presentations. Springs in, fades the backdrop. */
export function Sheet({ open, onClose, presentation = 'sheet', variant = 'glass', inline, children, style, testID, maxWidth = 560 }: SheetProps) {
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
      progress.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
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
          ? { opacity: progress.value, transform: [{ scale: 0.96 + progress.value * 0.04 }, { translateY: (1 - progress.value) * -8 }] }
          : { opacity: progress.value },
    [progress, presentation, height],
  )

  if (!mounted) return null
  const glass = variant === 'glass'
  const surface: ViewStyle = {
    backgroundColor: glass ? t.colors.glassFill : t.colors.surface,
    borderColor: glass ? t.colors.glassStroke : t.colors.hairline,
    borderWidth: hairlineWidth,
  }
  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]} pointerEvents={open ? 'auto' : 'none'}>
        {glass && Platform.OS !== 'web' ? (
          <BlurView intensity={20} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.overlay }]} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, presentation === 'spotlight' ? styles.centerTop : presentation === 'sheet' ? styles.bottom : null]} pointerEvents="box-none">
        <Animated.View
          style={[
            presentation === 'sheet'
              ? { borderTopLeftRadius: t.radii.xl, borderTopRightRadius: t.radii.xl, paddingBottom: 24, maxHeight: height * 0.9 }
              : presentation === 'spotlight'
                ? { width: '100%', maxWidth, borderRadius: t.radii.xl, marginTop: Math.max(72, height * 0.12), marginHorizontal: 16 }
                : { flex: 1 },
            surface,
            presentation === 'fullscreen' && { borderWidth: 0, borderRadius: 0 },
            panel,
            style,
          ]}
        >
          {presentation === 'sheet' ? <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: t.colors.hairlineStrong, marginTop: 8, marginBottom: 4 }} /> : null}
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
  centerTop: { alignItems: 'center', justifyContent: 'flex-start' },
})

export default Sheet
