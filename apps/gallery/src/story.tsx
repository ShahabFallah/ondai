import { useMemo, useState } from 'react'
import { Image, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { Chip } from '@ondai/registry/components/chip'
import { playgroundDefaults, queryDefaults, type Control, type PlaygroundDef, type PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost, glassBackdrop } from '@ondai/playground/host'
import { OndaiProvider, useOndai } from '@ondai/core'
import { mix } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'
import { Button, Label, Segmented } from '@/ui'
import { isSimulator, usePrefs } from '@/prefs'

/** Renders a component with the gallery's real Ondai instance (no mock). */
function RealHost({ def, query }: { def: PlaygroundDef; query: PlaygroundQuery }) {
  const ondai = useOndai()
  const t = useTheme()
  const state = def.states[query.state] ?? {}
  const props = { ...(query.props as Record<string, unknown>), ...(state.props ?? {}) }
  const content = def.render ? def.render(props as never, { state: query.state, stateDef: state, bind: () => {} }) : <def.component {...(props as object)} />
  return (
    <OndaiProvider key={query.state} value={ondai} withoutTheme>
      <View style={{ padding: def.frame.padding, backgroundColor: def.frame.background === 'surface' ? t.colors.surface : t.colors.bg, minHeight: def.frame.height, borderRadius: t.radii.lg, overflow: 'hidden' }}>
        {/* Glass (the material or the variant) needs something behind it: the playground's backdrop stands in for the app's content. */}
        {t.glass || props.variant === 'glass' || props.skin === 'glass' ? <GlassBackdrop dark={t.scheme === 'dark'} colour={hexOf(props.tint) ?? (t.accentName !== 'mono' ? t.colors.accent.solid : undefined)} /> : null}
        {content}
      </View>
    </OndaiProvider>
  )
}

/** The playground's named tints (each playground maps the same names); any hex passes through. */
const namedTints: Record<string, string> = { strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' }
const hexOf = (v: unknown) => (typeof v === 'string' ? (/^#[0-9a-f]{6}$/i.test(v) ? v : namedTints[v]) : undefined)

/**
 * The same backdrop the playground host draws for glass: a grainy monochrome field with window light in slats and
 * three large blurred shapes, in ink (mono) or in the tint and a warmer neighbour of it.
 */
function GlassBackdrop({ dark, colour }: { dark: boolean; colour?: string }) {
  const b = glassBackdrop
  const fill = StyleSheet.absoluteFill
  const shapes: Array<{ ink: string; opacity: number }> = colour
    ? dark
      ? [{ ink: colour, opacity: 0.62 }, { ink: mix(colour, '#FFD3A8', 0.5), opacity: 0.4 }, { ink: '#FFFFFF', opacity: 0.16 }]
      : [{ ink: colour, opacity: 0.78 }, { ink: mix(colour, '#FFD3A8', 0.55), opacity: 0.7 }, { ink: '#18181B', opacity: 0.3 }]
    : dark
      ? [{ ink: '#D4D4D8', opacity: 0.26 }, { ink: '#71717A', opacity: 0.38 }, { ink: '#FFFFFF', opacity: 0.18 }]
      : [{ ink: '#18181B', opacity: 0.62 }, { ink: '#71717A', opacity: 0.5 }, { ink: '#18181B', opacity: 0.38 }]
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      <Image source={dark ? b.field.void : b.field.paper} resizeMode="cover" style={fill} />
      {b.shapes.map((src, i) => (
        <Image key={i} source={src} resizeMode="cover" style={[fill, { tintColor: shapes[i]!.ink, opacity: shapes[i]!.opacity }]} />
      ))}
      <Image source={b.grain} resizeMode="repeat" style={[fill, { opacity: dark ? 0.7 : 0.9 }]} />
    </View>
  )
}

/** Phone screens are short: cap tall playground frames (CommandBar asks for 560) so the controls stay reachable. */
const MAX_FRAME_HEIGHT = 480

/** `initialState` lets a deep link open a state directly (ondai://component/summarize?state=thinking). */
export function Story({ def: input, initialState }: { def: PlaygroundDef; initialState?: string }) {
  const def = useMemo<PlaygroundDef>(() => (input.frame.height && input.frame.height > MAX_FRAME_HEIGHT ? { ...input, frame: { ...input.frame, height: MAX_FRAME_HEIGHT } } : input), [input])
  const t = useTheme()
  const prefs = usePrefs()
  const [state, setState] = useState(initialState && initialState in def.states ? initialState : def.defaultState)
  const [props, setProps] = useState<Record<string, unknown>>(() => playgroundDefaults(def) as Record<string, unknown>)
  const [real, setReal] = useState(!prefs.useMock)
  const query = useMemo<PlaygroundQuery>(() => ({ ...queryDefaults, props: props as never, state, theme: prefs.theme === 'system' ? 'void' : prefs.theme, material: prefs.material, accent: prefs.accent === 'custom' ? 'ion' : prefs.accent, device: 'apple' }), [props, state, prefs.theme, prefs.material, prefs.accent])
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
            <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textSecondary }]}>{real ? (isSimulator ? 'Apple model via Mac' : 'real device model') : 'scripted mock'}</Text>
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
          if (c.kind === 'number') {
            const step = c.step ?? 1
            const min = c.min ?? 0
            const max = c.max ?? 100
            const n = Number(v)
            const bump = (d: number) => setProp(k, Math.min(max, Math.max(min, Math.round((n + d * step) / step) * step)))
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label>{c.label ?? k}</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Button title="−" tone="outline" onPress={() => bump(-1)} disabled={n <= min} />
                  <Text style={[typeStyle(t, 'sm', { mono: true }), { color: t.colors.text, minWidth: 44, textAlign: 'center' }]}>{String(v)}</Text>
                  <Button title="+" tone="outline" onPress={() => bump(1)} disabled={n >= max} />
                </View>
              </View>
            )
          }
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
