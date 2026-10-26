import { View } from 'react-native'
import { Body, Card, Label, Screen, Segmented } from '@/ui'
import { isSimulator, usePrefs } from '@/prefs'

export default function SettingsScreen() {
  const p = usePrefs()
  return (
    <Screen title="Settings" subtitle="Theme, accent and provider mode for every demo.">
      <Card>
        <Label>Theme</Label>
        <Segmented options={['void', 'paper', 'glass', 'system'] as const} value={p.theme} onChange={(theme) => p.setPrefs({ theme })} />
        <Label>Accent</Label>
        <Segmented options={['ion', 'mono', 'aurora', 'ember'] as const} value={p.accent} onChange={(accent) => p.setPrefs({ accent })} />
      </Card>
      <Card>
        <Label>Model</Label>
        <Segmented options={['real', 'mock'] as const} value={p.useMock ? 'mock' : 'real'} onChange={(v) => p.setPrefs({ useMock: v === 'mock' })} />
        <Body size="sm">Real uses the device model (Apple Intelligence or Gemini Nano). Mock uses scripted output so every screen works anywhere.</Body>
        {isSimulator ? <Body size="sm">This is a simulator: Apple Foundation Models report available here but generation fails (host/runtime model-asset mismatch), so the mock is the default. See the Device tab for the raw state.</Body> : null}
        <Label>Latency chip</Label>
        <Segmented options={['show', 'hide'] as const} value={p.showLatency ? 'show' : 'hide'} onChange={(v) => p.setPrefs({ showLatency: v === 'show' })} />
      </Card>
      <View style={{ height: 8 }} />
    </Screen>
  )
}
