import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { ChevronLeft, Copy } from 'lucide-react-native'
import { playgrounds, type PlaygroundName } from '@ondai/registry/playgrounds'
import { manifest } from '@ondai/registry/manifest'
import type { PlaygroundDef } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Story } from '@/story'
import { Body, Label, Mono } from '@/ui'

export default function ComponentScreen() {
  const { name } = useLocalSearchParams<{ name: string }>()
  const t = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  const meta = manifest.find((m) => m.name === name)
  useEffect(() => {
    const loader = playgrounds[name as PlaygroundName]
    if (loader) void loader().then((m) => setDef(m.default as PlaygroundDef))
  }, [name])
  const install = `npx ondai add ${name}`
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 48 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} strokeWidth={1.5} color={t.colors.text} />
        </Pressable>
        <Text style={[typeStyle(t, 'lg', { weight: 'medium' }), { color: t.colors.text, flex: 1 }]}>{meta?.title ?? name}</Text>
        <Pressable onPress={() => void Clipboard.setStringAsync(install)} accessibilityRole="button" accessibilityLabel="Copy install command" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: t.colors.elevated }}>
          <Copy size={12} strokeWidth={1.5} color={t.colors.textSecondary} />
          <Mono>{install}</Mono>
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {meta ? <Body size="sm" color={t.colors.textSecondary} style={{ marginBottom: 12 }}>{meta.description}</Body> : null}
        {def ? <Story def={def} /> : <Label>loading…</Label>}
      </View>
    </View>
  )
}
