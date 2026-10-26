'use client'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Sparkles } from 'lucide-react-native'
import { ThemeProvider, useTheme } from '@ondai/tokens/react'
import { IonBorder } from '@ondai/registry/components/ion-border'

function Inner() {
  const t = useTheme()
  const [active, setActive] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <View style={{ padding: 32, gap: 24, backgroundColor: t.colors.bg, minHeight: 400 }} testID="spike-root">
      <IonBorder active={active} glow radius="xl" testID="spike-border">
        <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sparkles size={18} color={t.colors.accent.solid} strokeWidth={1.5} />
          <Text style={{ color: t.colors.text, fontFamily: t.fontFamilies.web.sans, fontSize: 17 }}>IonBorder spike · t={tick}s</Text>
        </View>
      </IonBorder>
      <Animated.View entering={FadeIn.duration(600)} testID="spike-fade">
        <Text style={{ color: t.colors.textSecondary, fontFamily: t.fontFamilies.web.mono, fontSize: 13 }}>FadeIn layout animation child</Text>
      </Animated.View>
      <Pressable onPress={() => setActive((a) => !a)} testID="spike-toggle" style={{ alignSelf: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: t.colors.elevated }}>
        <Text style={{ color: t.colors.text }}>{active ? 'Stop thinking' : 'Start thinking'}</Text>
      </Pressable>
    </View>
  )
}

export default function SpikeTree() {
  return (
    <ThemeProvider theme="void">
      <Inner />
    </ThemeProvider>
  )
}
