'use client'
import type { ReactNode } from 'react'
import { Text, View, useWindowDimensions } from 'react-native'
import { createOndai, OndaiProvider } from '@ondai/core'
import { mockAdapter, mockScript } from '@ondai/core/mock'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import type { AccentName, ThemeName } from '@ondai/tokens'
import { Button } from '@ondai/registry/components/button'
import { Chip } from '@ondai/registry/components/chip'
import { Field } from '@ondai/registry/components/field'
import { IonBorder } from '@ondai/registry/components/ion-border'
import { KeyHint } from '@ondai/registry/components/key-hint'
import { LatencyChip } from '@ondai/registry/components/latency-chip'
import { ModelDownload } from '@ondai/registry/components/model-download'
import { OnDeviceBadge } from '@ondai/registry/components/on-device-badge'
import { Skeleton } from '@ondai/registry/components/skeleton'
import { StreamingText } from '@ondai/registry/components/streaming-text'
import { ThinkingIndicator } from '@ondai/registry/components/thinking-indicator'

const ondai = createOndai({ providers: { mock: mockAdapter({ script: mockScript.stream('Quiet by default, alive when thinking.', 40) }) }, policy: { order: ['mock'], prewarm: 'never' } })

/** The width at which the sample splits into two app screens side by side. */
const TWO_COLUMNS_FROM = 1280
const SCREEN = 420
const SCREEN_NARROW = 372

/** One phone screen: status bar, then the app. Drawn with the theme's own background so Paper stays light. */
function Screen({ width, children }: { width: number; children: ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ width, maxWidth: '100%', borderRadius: 28, backgroundColor: t.glass ? 'transparent' : t.colors.bg, borderWidth: 1, borderColor: t.colors.hairline, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14 }}>
        <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>9:41</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          {[4, 6, 8, 10].map((h) => (
            <View key={h} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: t.colors.text }} />
          ))}
          <View style={{ marginLeft: 6, width: 22, height: 11, borderRadius: 3.5, borderWidth: 1, borderColor: t.colors.textTertiary, padding: 1.5 }}>
            <View style={{ flex: 1, width: '72%', borderRadius: 1.5, backgroundColor: t.colors.text }} />
          </View>
        </View>
      </View>
      {children}
    </View>
  )
}

function Title({ children, right }: { children: string; right?: ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[typeStyle(t, '2xl', { weight: 'medium' }), { color: t.colors.text }]}>{children}</Text>
      {right}
    </View>
  )
}

/** The inbox: a summary streaming inside the ion border, a filled field, filters and actions. */
function Inbox() {
  const t = useTheme()
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Title right={<OnDeviceBadge size="sm" state="thinking" provider="apple" locality="on-device" />}>Inbox</Title>
      <IonBorder active glow radius="lg">
        <View style={{ padding: 14, gap: 8 }}>
          <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Summary of 14 messages</Text>
          <StreamingText text="Venue confirmed for Friday at noon. Priya's revised budget moves hardware to Q1. Headcount numbers are due Wednesday." streaming />
        </View>
      </IonBorder>
      <Field label="Merchant" value="Luigi's Trattoria" confidence={0.92} />
      <Field label="Amount" value="€42.80" confidence={0.71} confidenceStyle="badge" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Groceries" selected onPress={() => {}} />
        <Chip label="Transport" onPress={() => {}} />
        <Chip label="Dining" variant="outline" onPress={() => {}} />
        <Chip label="Ideas" ghost onPress={() => {}} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Summarize" variant="solid" size="sm" />
        <Button title="Rewrite" variant="soft" size="sm" />
        <Button title="Run" variant="accent" size="sm" />
        <Button title="Cancel" variant="ghost" size="sm" />
      </View>
    </View>
  )
}

/** The model side: download, the thinking family, a loading list, metrics, and the type scale. */
function Model({ divider }: { divider?: boolean }) {
  const t = useTheme()
  return (
    <View style={{ padding: 20, gap: 16, borderTopWidth: divider ? 1 : 0, borderTopColor: t.colors.hairline }}>
      <Title right={<KeyHint keys={['cmd', 'K']} size="sm" />}>Assistant</Title>
      <ModelDownload progress={0.62} variant="bar" size="sm" label="Preparing model" detail="1.2 GB · Wi-Fi only" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
        <ThinkingIndicator variant="dots" size="sm" />
        <ThinkingIndicator variant="orb" size="sm" />
        <ThinkingIndicator variant="line" size="sm" />
        <ThinkingIndicator variant="sweep" size="sm" />
      </View>
      <Skeleton lines={3} />
      <View style={{ flexDirection: 'row' }}>
        <LatencyChip latencyMs={142} tokensPerSecond={38} provider="apple" size="sm" />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Suggested replies</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Sounds good" size="sm" onPress={() => {}} />
          <Chip label="Can we move it?" size="sm" onPress={() => {}} />
          <Chip label="Send the deck" size="sm" onPress={() => {}} />
        </View>
      </View>
      <View style={{ gap: 4, paddingTop: 4 }}>
        <Text style={[typeStyle(t, '3xl', { weight: 'medium' }), { color: t.colors.text }]}>Aa 32</Text>
        <Text style={[typeStyle(t, 'lg'), { color: t.colors.text }]}>Body 17, content first.</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Secondary 13</Text>
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary }]}>mono 11 · 142 ms · 38 tok/s</Text>
      </View>
    </View>
  )
}

function Sample() {
  const { width } = useWindowDimensions()
  if (width >= TWO_COLUMNS_FROM) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 24 }}>
        <Screen width={SCREEN_NARROW}>
          <Inbox />
        </Screen>
        <Screen width={SCREEN_NARROW}>
          <Model />
        </Screen>
      </View>
    )
  }
  return (
    <Screen width={SCREEN}>
      <Inbox />
      <Model divider />
    </Screen>
  )
}

export default function ThemePreview({ theme, accent, custom }: { theme: Exclude<ThemeName, 'system'>; accent: AccentName; custom: { a: string; b: string; c: string } }) {
  return (
    <OndaiProvider value={ondai} theme={theme} accent={accent} customAccent={custom}>
      <Sample />
    </OndaiProvider>
  )
}
