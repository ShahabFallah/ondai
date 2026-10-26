import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { manifest } from '@ondai/registry/manifest'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { Screen } from '@/ui'
import { Chip } from '@ondai/registry/components/chip'
import { OnDeviceBadge } from '@ondai/registry/components/on-device-badge'

const categories = ['all', 'primitive', 'agentic', 'input', 'text', 'organize', 'search', 'vision'] as const

export default function HomeScreen() {
  const t = useTheme()
  const router = useRouter()
  const [cat, setCat] = useState<(typeof categories)[number]>('all')
  const items = useMemo(() => manifest.filter((m) => m.hasPlayground && (cat === 'all' || m.category === cat)), [cat])
  return (
    <Screen title="Ondai" subtitle="On-device AI components. Everything here runs on this phone.">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <OnDeviceBadge size="sm" />
        <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`${items.length} components`}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
        {categories.map((c) => (
          <Chip key={c} label={c} size="sm" variant="ghost" selected={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((m) => (
          <Pressable
            key={m.name}
            onPress={() => router.push(`/component/${m.name}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ width: '48%', flexGrow: 1, minHeight: 112, padding: 14, gap: 6, borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: pressed ? t.colors.elevatedHover : t.colors.surface })}
          >
            <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>{m.category}</Text>
            <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]}>{m.title}</Text>
            <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]} numberOfLines={3}>
              {m.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}
