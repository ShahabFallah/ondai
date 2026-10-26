'use client'
import { Text, View } from 'react-native'
import { createOndai, OndaiProvider } from '@ondai/core'
import { mockAdapter, mockScript } from '@ondai/core/mock'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import type { AccentName, ThemeName } from '@ondai/tokens'
import { IonBorder } from '@ondai/registry/components/ion-border'
import { OnDeviceBadge } from '@ondai/registry/components/on-device-badge'
import { Button } from '@ondai/registry/components/button'
import { Chip } from '@ondai/registry/components/chip'
import { Field } from '@ondai/registry/components/field'
import { ThinkingIndicator } from '@ondai/registry/components/thinking-indicator'
import { ModelDownload } from '@ondai/registry/components/model-download'
import { StreamingText } from '@ondai/registry/components/streaming-text'

const ondai = createOndai({ providers: { mock: mockAdapter({ script: mockScript.stream('Quiet by default, alive when thinking.', 40) }) }, policy: { order: ['mock'], prewarm: 'never' } })

function Sample() {
  const t = useTheme()
  return (
    <View style={{ padding: 28, gap: 20, minHeight: 560 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typeStyle(t, '2xl', { weight: 'semibold' }), { color: t.colors.text }]}>Inbox</Text>
        <OnDeviceBadge size="sm" state="thinking" provider="apple" locality="on-device" />
      </View>
      <IonBorder active glow radius="lg">
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textSecondary }]}>TL;DR</Text>
          <StreamingText text="Venue confirmed Friday at noon. Priya's revised budget moves hardware to Q1. Headcount due Wednesday." streaming />
        </View>
      </IonBorder>
      <Field label="Merchant" value="Luigi's Trattoria" confidence={0.9} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Groceries" selected onPress={() => {}} />
        <Chip label="Transport" onPress={() => {}} />
        <Chip label="Dining" variant="outline" onPress={() => {}} />
        <Chip label="Ideas" ghost onPress={() => {}} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Summarize" variant="solid" />
        <Button title="Rewrite" variant="soft" />
        <Button title="Run" variant="accent" />
        <Button title="Cancel" variant="ghost" />
      </View>
      <ModelDownload progress={0.62} variant="bar" size="sm" label="Preparing model" detail="1.2 GB · Wi-Fi only" />
      <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
        <ThinkingIndicator variant="dots" size="md" />
        <ThinkingIndicator variant="orb" size="md" />
        <ThinkingIndicator variant="line" size="md" />
        <ThinkingIndicator variant="sweep" size="md" />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={[typeStyle(t, '3xl', { weight: 'semibold' }), { color: t.colors.text }]}>Aa 32</Text>
        <Text style={[typeStyle(t, 'lg'), { color: t.colors.text }]}>Body large 17 — content first, chrome out of the way.</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>Secondary 13</Text>
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true }), { color: t.colors.textTertiary }]}>mono tag 11 · 142ms · 38 tok/s</Text>
      </View>
    </View>
  )
}

export default function ThemePreview({ theme, accent, custom }: { theme: Exclude<ThemeName, 'system'>; accent: AccentName; custom: { a: string; b: string; c: string } }) {
  return (
    <OndaiProvider value={ondai} theme={theme} accent={accent} customAccent={custom}>
      <Sample />
    </OndaiProvider>
  )
}
