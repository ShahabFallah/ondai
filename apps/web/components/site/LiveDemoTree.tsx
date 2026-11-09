'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { playgroundDefaults, queryDefaults, type PlaygroundDef, type PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'
import { playgrounds } from '@ondai/registry/playgrounds'
import { demos, type Demo, type DemoName } from './demos'

type Loader = () => Promise<{ default: PlaygroundDef }>
const registered = playgrounds as Partial<Record<string, Loader>>

const titleOf = (name: string) =>
  name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')

/** The react-native-web tree for one live demo. Loaded client-only; the mock answers from `demos.ts`. */
export default function LiveDemoTree({
  name,
  theme: themeProp,
  overrides,
  title,
  onReady,
  adapt,
}: {
  name: DemoName
  /** Unset follows the site theme: paper in light mode, void in dark. */
  theme?: 'void' | 'paper' | 'glass'
  overrides?: Record<string, unknown>
  title?: string
  onReady?: () => void
  /** Swap parts of the playground definition (a custom render for a recording, say). Keep it stable. */
  adapt?: (def: PlaygroundDef) => PlaygroundDef
}) {
  const { resolvedTheme } = useTheme()
  const siteDark = resolvedTheme ? resolvedTheme === 'dark' : typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const theme = themeProp ?? (siteDark ? 'void' : 'paper')
  const loader = registered[name]
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  useEffect(() => {
    if (!loader) return
    let alive = true
    loader()
      .then((m) => alive && setDef(m.default))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [loader])

  const ready = useRef(onReady)
  ready.current = onReady

  const demo: Demo = demos[name]
  // Overrides are compared by value so an inline object does not remount the host.
  const overridesKey = JSON.stringify(overrides ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableOverrides = useMemo(() => overrides, [overridesKey])
  const live = useMemo<PlaygroundDef | null>(() => (def ? { ...(adapt ? adapt(def) : def), states: { live: { script: demo.script } }, defaultState: 'live', review: [] } : null), [def, demo, adapt])
  const query = useMemo<PlaygroundQuery | null>(
    () =>
      def
        ? {
            ...queryDefaults,
            props: { ...(playgroundDefaults(def) as Record<string, unknown>), ...demo.props, ...stableOverrides } as PlaygroundQuery['props'],
            state: 'live',
            theme,
            // The site is black and white; the components' AI accent follows.
            accent: 'mono',
            tps: 60,
          }
        : null,
    [def, demo, theme, stableOverrides],
  )

  if (!loader) {
    // Not in the registry build yet: keep the stage, name the component.
    return (
      <div className="flex h-full min-h-[120px] w-full items-center justify-center text-[14px] text-[color:var(--ondai-text-tertiary)]" data-demo-missing={name}>
        {title ?? titleOf(name)}
      </div>
    )
  }
  if (!live || !query) return null
  return <PlaygroundHost def={live} query={query} bare onReady={() => ready.current?.()} />
}
