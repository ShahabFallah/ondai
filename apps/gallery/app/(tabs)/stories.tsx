import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { manifest } from '@ondai/registry/manifest'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { Screen } from '@/ui'

export default function StoriesScreen() {
  const t = useTheme()
  const router = useRouter()
  return (
    <Screen title="Stories" subtitle="Every variant and state of every component, on device. Toggle between the real model and the scripted mock.">
      <View style={{ borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, overflow: 'hidden' }}>
        {manifest
          .filter((m) => m.hasPlayground)
          .map((m, i) => (
            <Pressable key={m.name} onPress={() => router.push(`/component/${m.name}`)} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, gap: 12, borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline, backgroundColor: pressed ? t.colors.elevatedHover : t.colors.surface })}>
              <Text style={[typeStyle(t, 'md'), { color: t.colors.text, flex: 1 }]}>{m.title}</Text>
              <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{Object.keys(m.variants).length ? Object.values(m.variants).reduce((a, v) => a * v.length, 1) + ' variants' : ''}</Text>
              <ChevronRight size={16} strokeWidth={1.5} color={t.colors.textTertiary} />
            </Pressable>
          ))}
      </View>
    </Screen>
  )
}
