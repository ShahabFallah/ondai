import { useEffect, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { generateText } from 'ai'
import { useOndai, useStreamText, type Availability, type ProviderAdapter, estimateTokens } from '@ondai/core'
import { useTheme } from '@ondai/tokens/react'
import { Body, Button, Card, Label, Mono, Row, Screen } from '@/ui'
import { isSimulator, usePrefs } from '@/prefs'
import { realProviders } from '@/ondai'
import { runSpike } from '@/spike'

function describe(av: Availability | undefined): { text: string; color: 'ok' | 'warn' | 'bad' | 'muted' } {
  if (!av) return { text: 'checking…', color: 'muted' }
  if (av.status === 'ready') return { text: 'ready', color: 'ok' }
  if (av.status === 'preparing') return { text: `preparing ${av.progress !== undefined ? Math.round(av.progress * 100) + '%' : ''}`, color: 'warn' }
  return { text: `${av.reason}${av.detail ? ` · ${av.detail}` : ''}`, color: 'bad' }
}

const rawError = (e: unknown) => (e instanceof Error ? [e.name, e.message, (e as { code?: string }).code].filter(Boolean).join(' · ') : String(e))

type Probe = { status: 'idle' } | { status: 'running' } | { status: 'ok'; text: string; ms: number } | { status: 'error'; error: string; ms: number }

/** Talks to the real on-device provider directly, bypassing the mock, so the simulator/device truth is always visible. */
function HardwareCard() {
  const t = useTheme()
  const adapters = useMemo(() => Object.values(realProviders()), [])
  const [avail, setAvail] = useState<Record<string, Availability | undefined>>({})
  const [probe, setProbe] = useState<Probe>({ status: 'idle' })
  useEffect(() => {
    let alive = true
    void Promise.all(adapters.map(async (a) => [a.id, await a.availability()] as const)).then((pairs) => {
      if (alive) setAvail(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
  }, [adapters])
  const run = async () => {
    const a = adapters.find((x) => avail[x.id]?.status === 'ready' && x.languageModel)
    if (!a) return
    setProbe({ status: 'running' })
    const t0 = Date.now()
    try {
      const res = await generateText({ model: a.languageModel!(), prompt: 'Say hello in three words.' })
      setProbe({ status: 'ok', text: res.text, ms: Date.now() - t0 })
    } catch (e) {
      console.log('[ondai-hardware] generation failed', rawError(e))
      setProbe({ status: 'error', error: rawError(e), ms: Date.now() - t0 })
    }
  }
  const colors = { ok: t.colors.success, warn: t.colors.warning, bad: t.colors.danger, muted: t.colors.textTertiary }
  const ready = adapters.some((a) => avail[a.id]?.status === 'ready')
  useEffect(() => {
    // Dev switch: EXPO_PUBLIC_ONDAI_AUTORUN=1 probes the hardware model as soon as it reports ready.
    if (process.env.EXPO_PUBLIC_ONDAI_AUTORUN === '1' && ready && probe.status === 'idle') void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  return (
    <Card>
      <Label>Hardware model</Label>
      {adapters.length === 0 ? <Body size="sm" color={t.colors.textSecondary}>No on-device provider on {Platform.OS}.</Body> : null}
      {adapters.map((a) => {
        const d = describe(avail[a.id])
        return <Row key={a.id} label={a.label} value={d.text} valueColor={colors[d.color]} />
      })}
      <Row label="Device" value={isSimulator ? 'simulator' : 'physical'} />
      {isSimulator ? (
        <Body size="sm" color={t.colors.textSecondary}>
          On the iOS simulator Apple Foundation Models report ready but every generation fails with GenerationError −1 (UnifiedAssetFramework 5000): the simulator runtime cannot reach the host&apos;s model assets. Install the Xcode 27.1 runtime (iOS 27.1) or use a physical iPhone with Apple Intelligence.
        </Body>
      ) : null}
      <Button title={probe.status === 'running' ? 'Probing…' : 'Probe real generation'} tone="outline" disabled={!ready || probe.status === 'running'} onPress={() => void run()} />
      {probe.status === 'ok' ? (
        <>
          <Body>{probe.text}</Body>
          <Row label="Latency" value={`${probe.ms} ms`} valueColor={t.colors.success} />
        </>
      ) : null}
      {probe.status === 'error' ? (
        <>
          <Mono color={t.colors.danger}>{probe.error}</Mono>
          <Row label="Failed after" value={`${probe.ms} ms`} valueColor={t.colors.danger} />
        </>
      ) : null}
    </Card>
  )
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
        <Row label="Mode" value={prefs.useMock ? 'scripted mock' : 'real providers'} />
        <Row label="Policy" value={ondai.policy.order.join(' → ')} />
        <Row label="Budget" value={`${ondai.policy.tokenBudget} tokens`} />
      </Card>
      <HardwareCard />
      {ondai.adapters().map((a: ProviderAdapter) => {
        const d = describe(avail[a.id])
        return (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Body size="lg" style={{ fontWeight: '500', flexShrink: 1 }}>
                {a.id === 'mock' ? `${a.label} (scripted mock)` : a.label}
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
          Streams “Explain on-device AI in one sentence” through the active provider ({prefs.useMock ? 'scripted mock' : 'first ready device model'}) and measures cold start, time to first token and tokens per second.
        </Body>
        <Button title={stream.isBusy ? 'Running…' : 'Run spike'} disabled={stream.isBusy} onPress={() => void stream.run('Explain on-device AI in one sentence.').catch(() => {})} />
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
