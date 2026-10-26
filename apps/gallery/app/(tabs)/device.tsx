import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'
import { useOndai, useStreamText, type Availability, type ProviderAdapter, estimateTokens } from '@ondai/core'
import { useTheme } from '@ondai/tokens/react'
import { Body, Button, Card, Label, Mono, Row, Screen } from '@/ui'
import { usePrefs } from '@/prefs'
import { runSpike } from '@/spike'

function describe(av: Availability | undefined): { text: string; color: 'ok' | 'warn' | 'bad' | 'muted' } {
  if (!av) return { text: 'checking…', color: 'muted' }
  if (av.status === 'ready') return { text: 'ready', color: 'ok' }
  if (av.status === 'preparing') return { text: `preparing ${av.progress !== undefined ? Math.round(av.progress * 100) + '%' : ''}`, color: 'warn' }
  return { text: `${av.reason}${av.detail ? ` · ${av.detail}` : ''}`, color: 'bad' }
}

export default function DeviceScreen() {
  const ondai = useOndai()
  const t = useTheme()
  const prefs = usePrefs()
  const [avail, setAvail] = useState<Record<string, Availability | undefined>>({})
  const stream = useStreamText({ component: 'device-spike', system: 'Answer in one short sentence.' })
  useEffect(() => {
    if (stream.metrics) console.log('[ondai-spike] metrics', JSON.stringify({ provider: stream.provider, locality: stream.locality, ...stream.metrics }))
    if (stream.error) console.log('[ondai-spike] error', stream.error.kind, JSON.stringify(stream.error.raw instanceof Error ? { name: stream.error.raw.name, message: stream.error.raw.message, code: (stream.error.raw as { code?: string }).code } : stream.error.raw))
  }, [stream.metrics, stream.error, stream.provider, stream.locality])

  useEffect(() => {
    let alive = true
    const load = async () => {
      await ondai.refresh()
      const next: Record<string, Availability> = {}
      for (const a of ondai.adapters()) next[a.id] = await ondai.availabilityOf(a.id)
      if (alive) setAvail(next)
      console.log('[ondai-spike] availability', JSON.stringify(next))
      if (process.env.EXPO_PUBLIC_ONDAI_AUTORUN === '1' && Object.values(next).some((a) => a?.status === 'ready')) {
        await runSpike(ondai).catch((e) => console.log('[spike] fatal', String(e)))
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [ondai])

  const colors = { ok: t.colors.success, warn: t.colors.warning, bad: t.colors.danger, muted: t.colors.textTertiary }
  const tps = stream.metrics?.tokensPerSecond
  return (
    <Screen title="Device" subtitle="Detected providers, capabilities and raw availability. Paste this into bug reports.">
      <Card>
        <Label>Platform</Label>
        <Row label="OS" value={`${Platform.OS} ${Platform.Version}`} />
        <Row label="Mode" value={prefs.useMock ? 'mock provider' : 'real providers'} />
        <Row label="Policy" value={ondai.policy.order.join(' → ')} />
        <Row label="Budget" value={`${ondai.policy.tokenBudget} tokens`} />
      </Card>
      {ondai.adapters().map((a: ProviderAdapter) => {
        const d = describe(avail[a.id])
        return (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Body size="lg" style={{ fontWeight: '500' }}>
                {a.label}
              </Body>
              <Mono color={colors[d.color]}>{d.text}</Mono>
            </View>
            <Row label="Locality" value={a.locality} />
            <Row label="Capabilities" value={[...a.capabilities].join(', ')} />
            <Row label="Context" value={a.contextWindow ? `${a.contextWindow} tokens` : 'unknown'} />
          </Card>
        )
      })}
      <Card>
        <Label>Generation spike</Label>
        <Body size="sm" color={t.colors.textSecondary}>
          Runs one short prompt through the first ready provider and measures cold start, time to first token and tokens per second.
        </Body>
        <Button title={stream.isBusy ? 'Running…' : 'Run "Explain on-device AI in one sentence"'} disabled={stream.isBusy} onPress={() => void stream.run('Explain on-device AI in one sentence.').catch(() => {})} />
        {stream.text ? <Body>{stream.text}</Body> : null}
        {stream.error ? <Mono color={t.colors.danger}>{`${stream.error.kind}: ${String((stream.error.raw as Error)?.message ?? stream.error.message)}`}</Mono> : null}
        {stream.metrics ? (
          <>
            <Row label="Provider" value={`${stream.provider ?? '—'} (${stream.locality ?? '—'})`} />
            <Row label="Latency" value={`${stream.metrics.latencyMs} ms`} />
            <Row label="TTFT" value={stream.metrics.ttftMs !== undefined ? `${stream.metrics.ttftMs} ms` : '—'} />
            <Row label="Throughput" value={tps ? `${tps} tok/s` : '—'} />
            <Row label="Output" value={`≈${estimateTokens(stream.text)} tokens`} />
          </>
        ) : null}
      </Card>
    </Screen>
  )
}
