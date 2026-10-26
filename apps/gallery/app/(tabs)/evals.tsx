import { useState } from 'react'
import { Platform, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useOndai, type EvalReport } from '@ondai/core'
import { runners } from '@ondai/evals/runners'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Body, Button, Card, Label, Mono, Row, Screen } from '@/ui'

export default function EvalsScreen() {
  const t = useTheme()
  const ondai = useOndai()
  const [running, setRunning] = useState<string | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [reports, setReports] = useState<Record<string, EvalReport>>({})

  const run = async (name: keyof typeof runners) => {
    setRunning(name)
    try {
      const r = await runners[name](ondai, (d, tot) => setProgress([d, tot]))
      setReports((x) => ({ ...x, [name]: { ...r, device: `${Platform.OS} ${Platform.Version}` } }))
    } finally {
      setRunning(null)
      setProgress(null)
    }
  }
  const exportJson = () => void Clipboard.setStringAsync(JSON.stringify(Object.values(reports), null, 2))
  return (
    <Screen title="Evals" subtitle="Runs the fixture sets on this device with the real model and reports pass rates. Export copies JSON for evals/results/.">
      {Object.keys(runners).map((name) => {
        const r = reports[name]
        return (
          <Card key={name}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Body size="lg" style={{ fontWeight: '500' }}>{name}</Body>
              {r ? <Mono color={r.ok ? t.colors.success : t.colors.warning}>{`${r.passed}/${r.total} · ${Math.round(r.passRate * 100)}%`}</Mono> : <Label>not run</Label>}
            </View>
            {r ? <Row label="Mean latency" value={`${r.meanLatencyMs} ms`} /> : null}
            {r?.results.filter((x) => !x.pass).slice(0, 3).map((x) => (
              <Text key={x.id} style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{`✗ ${x.id}${x.detail ? ` · ${x.detail}` : ''}${x.error ? ` · ${x.error.slice(0, 80)}` : ''}`}</Text>
            ))}
            <Button title={running === name ? (progress ? `Running ${progress[0]}/${progress[1]}…` : 'Running…') : r ? 'Run again' : 'Run'} tone="outline" disabled={!!running} onPress={() => void run(name as keyof typeof runners)} />
          </Card>
        )
      })}
      {Object.keys(reports).length ? <Button title="Copy results JSON" onPress={exportJson} /> : null}
    </Screen>
  )
}
