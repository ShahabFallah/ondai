import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import { Activity, Cpu, LayoutGrid, Settings2, Sparkles } from 'lucide-react-native'
import { useTheme } from '@ondai/tokens/react'
import { hairlineWidth } from '@ondai/tokens/react'

export default function TabsLayout() {
  const t = useTheme()
  const icon = (Icon: typeof Cpu) => ({ color }: { color: ColorValue }) => <Icon size={20} strokeWidth={1.5} color={String(color)} />
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.text,
        tabBarInactiveTintColor: t.colors.textTertiary,
        tabBarStyle: { backgroundColor: t.colors.bg, borderTopColor: t.colors.hairline, borderTopWidth: hairlineWidth },
        tabBarLabelStyle: { fontFamily: t.fontFamilies.native.mono.medium, fontSize: 10, letterSpacing: 0.6 },
        sceneStyle: { backgroundColor: t.colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'COMPONENTS', tabBarIcon: icon(LayoutGrid) }} />
      <Tabs.Screen name="stories" options={{ title: 'STORIES', tabBarIcon: icon(Sparkles) }} />
      <Tabs.Screen name="evals" options={{ title: 'EVALS', tabBarIcon: icon(Activity) }} />
      <Tabs.Screen name="device" options={{ title: 'DEVICE', tabBarIcon: icon(Cpu) }} />
      <Tabs.Screen name="settings" options={{ title: 'SETTINGS', tabBarIcon: icon(Settings2) }} />
    </Tabs>
  )
}
