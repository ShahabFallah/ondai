import { useEffect, useMemo, useRef } from 'react'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist'
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono'
import { OndaiProvider } from '@ondai/core'
import { useTheme } from '@ondai/tokens/react'
import { View } from 'react-native'
import { PrefsProvider, usePrefs } from '@/prefs'
import { MetricsProvider, useMetrics } from '@/metrics'
import { createGalleryOndai } from '@/ondai'

void SplashScreen.preventAutoHideAsync().catch(() => {})

function Shell() {
  const prefs = usePrefs()
  const metrics = useMetrics()
  const pushRef = useRef(metrics.push)
  pushRef.current = metrics.push
  const ondai = useMemo(() => createGalleryOndai(prefs.useMock, (m) => pushRef.current(m)), [prefs.useMock])
  return (
    <OndaiProvider value={ondai} theme={prefs.theme} material={prefs.material} accent={prefs.accent}>
      <Chrome />
    </OndaiProvider>
  )
}

/** Dev-only screenshot tour: EXPO_PUBLIC_ONDAI_TOUR="/a,/b" cycles through routes every 5s. */
function useTour() {
  const router = useRouter()
  useEffect(() => {
    const routes = (process.env.EXPO_PUBLIC_ONDAI_TOUR ?? '').split(',').map((r: string) => r.trim()).filter(Boolean)
    if (!routes.length) return
    let i = 0
    const h = setInterval(() => {
      router.replace(routes[i++ % routes.length] as never)
    }, 5000)
    return () => clearInterval(h)
  }, [router])
}

function Chrome() {
  const t = useTheme()
  useTour()
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }} />
    </View>
  )
}

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold })
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync().catch(() => {})
  }, [loaded])
  if (!loaded) return null
  return (
    <PrefsProvider>
      <MetricsProvider>
        <Shell />
      </MetricsProvider>
    </PrefsProvider>
  )
}
