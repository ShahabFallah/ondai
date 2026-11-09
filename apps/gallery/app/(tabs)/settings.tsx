import { View } from 'react-native'
import { Body, Card, Label, Screen, Segmented } from '@/ui'
import { isSimulator, usePrefs } from '@/prefs'

export default function SettingsScreen() {
  const p = usePrefs()
  return (
    <Screen title="Settings" subtitle="Theme, accent and provider mode for every demo.">
      <Card>
        <Label>Appearance</Label>
        <Segmented options={['paper', 'void', 'system'] as const} value={p.theme === 'glass' ? 'void' : p.theme} onChange={(theme) => p.setPrefs({ theme })} format={(v) => ({ paper: 'Light', void: 'Dark', system: 'System' })[v]} />
        <Label>Surface</Label>
        <Segmented options={['solid', 'glass', 'native'] as const} value={p.material} onChange={(material) => p.setPrefs({ material })} format={(v) => ({ solid: 'Solid', glass: 'Glass', native: 'Native' })[v]} />
        <Body size="sm">Native uses the platform's own material: Liquid Glass on iOS 26, Material 3 surfaces on Android.</Body>
        <Label>Accent</Label>
        <Segmented options={['ion', 'mono', 'aurora', 'ember'] as const} value={p.accent} onChange={(accent) => p.setPrefs({ accent })} format={(v) => v[0]!.toUpperCase() + v.slice(1)} />
      </Card>
      <Card>
        <Label>Model</Label>
        <Segmented options={['real', 'mock'] as const} value={p.useMock ? 'mock' : 'real'} onChange={(v) => p.setPrefs({ useMock: v === 'mock' })} />
        <Body size="sm">Real uses the device model (Apple Intelligence or Gemini Nano). Mock uses scripted output so every screen works anywhere.</Body>
        {isSimulator ? <Body size="sm">This is a simulator. It can't run Apple's model itself, so this Mac runs it and the simulator talks to it (run `pnpm bridge`). Same model, real answers, badge reads Local · Mac.</Body> : null}
        <Label>Latency chip</Label>
        <Segmented options={['show', 'hide'] as const} value={p.showLatency ? 'show' : 'hide'} onChange={(v) => p.setPrefs({ showLatency: v === 'show' })} />
      </Card>
      <View style={{ height: 8 }} />
    </Screen>
  )
}
