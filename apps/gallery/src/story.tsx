import { useMemo, useState } from 'react'
import { ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { Chip } from '@ondai/registry/components/chip'
import { playgroundDefaults, queryDefaults, type Control, type PlaygroundDef, type PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'
import { OndaiProvider, useOndai } from '@ondai/core'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { Label, Segmented } from '@/ui'
import { usePrefs } from '@/prefs'

/** Renders a component with the gallery's real Ondai instance (no mock). */
function RealHost({ def, query }: { def: PlaygroundDef; query: PlaygroundQuery }) {
  const ondai = useOndai()
  const t = useTheme()
  const state = def.states[query.state] ?? {}
  const props = { ...(query.props as Record<string, unknown>), ...(state.props ?? {}) }
  const content = def.render ? def.render(props as never, { state: query.state, stateDef: state, bind: () => {} }) : <def.component {...(props as object)} />
  return (
    <OndaiProvider key={query.state} value={ondai} withoutTheme>
      <View style={{ padding: def.frame.padding, backgroundColor: def.frame.background === 'surface' ? t.colors.surface : t.colors.bg, minHeight: def.frame.height, borderRadius: t.radii.lg }}>{content}</View>
    </OndaiProvider>
  )
}

export function Story({ def }: { def: PlaygroundDef }) {
  const t = useTheme()
  const prefs = usePrefs()
  const [state, setState] = useState(def.defaultState)
  const [props, setProps] = useState<Record<string, unknown>>(() => playgroundDefaults(def) as Record<string, unknown>)
  const [real, setReal] = useState(!prefs.useMock)
  const query = useMemo<PlaygroundQuery>(() => ({ ...queryDefaults, props: props as never, state, theme: prefs.theme === 'system' ? 'void' : prefs.theme, accent: prefs.accent === 'custom' ? 'ion' : prefs.accent, device: 'apple' }), [props, state, prefs.theme, prefs.accent])
  const setProp = (k: string, v: unknown) => setProps((p) => ({ ...p, [k]: v }))
  const entries = Object.entries(def.controls) as Array<[string, Control]>
  const states = Object.keys(def.states)
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
      <View style={{ borderRadius: t.radii.lg, overflow: 'hidden', borderWidth: hairlineWidth, borderColor: t.colors.hairline }}>
        {real ? <RealHost def={def} query={query} /> : <PlaygroundHost def={def} query={query} style={{ width: '100%' }} />}
      </View>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>Model</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textSecondary }]}>{real ? 'real device model' : 'scripted mock'}</Text>
            <Switch value={real} onValueChange={setReal} trackColor={{ true: t.colors.accent.solid }} />
          </View>
        </View>
        <Label>State</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {states.map((st) => (
            <Chip key={st} label={st} size="sm" variant="ghost" selected={state === st} onPress={() => setState(st)} />
          ))}
        </ScrollView>
        {def.states[state]?.description ? <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>{def.states[state]?.description}</Text> : null}
        {entries.map(([k, c]) => {
          const v = props[k]
          if (c.kind === 'select')
            return (
              <View key={k} style={{ gap: 6 }}>
                <Label>{c.label ?? k}</Label>
                {c.options.length > 3 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {c.options.map((o) => (
                      <Chip key={o} label={o} size="sm" variant="ghost" selected={String(v) === o} onPress={() => setProp(k, o)} />
                    ))}
                  </ScrollView>
                ) : (
                  <Segmented options={c.options as [string, ...string[]]} value={String(v)} onChange={(x) => setProp(k, x)} />
                )}
              </View>
            )
          if (c.kind === 'boolean')
            return (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>{c.label ?? k}</Label>
                <Switch value={!!v} onValueChange={(x) => setProp(k, x)} trackColor={{ true: t.colors.accent.solid }} />
              </View>
            )
          if (c.kind === 'number')
            return (
              <View key={k} style={{ gap: 6 }}>
                <Label>{`${c.label ?? k} · ${String(v)}`}</Label>
                <Segmented options={[String(c.min ?? 0), String(c.default), String(c.max ?? 100)] as [string, ...string[]]} value={String(v)} onChange={(x) => setProp(k, Number(x))} />
              </View>
            )
          return (
            <View key={k} style={{ gap: 6 }}>
              <Label>{c.label ?? k}</Label>
              <TextInput value={String(v ?? '')} onChangeText={(x) => setProp(k, x)} multiline={c.multiline} placeholderTextColor={t.colors.textTertiary} style={[typeStyle(t, 'md'), { color: t.colors.text, backgroundColor: t.colors.input, borderRadius: t.radii.md, paddingHorizontal: 12, paddingVertical: 10 }]} />
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
