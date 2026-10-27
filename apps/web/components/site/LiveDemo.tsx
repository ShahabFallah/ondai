'use client'
import dynamic from 'next/dynamic'
import type { DemoName } from './demos'

const Tree = dynamic(() => import('./LiveDemoTree'), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden />,
})

export interface LiveDemoProps {
  name: DemoName
  theme?: 'void' | 'paper' | 'glass'
  /** Props merged over the demo's defaults (e.g. a shorter placeholder inside the phone). */
  props?: Record<string, unknown>
  /** Shown in tertiary text when the component is not in the registry build yet. */
  title?: string
  /** Fired once the component has mounted on the mock. */
  onReady?: () => void
}

/** A registry component, live, on the scripted mock. Everything the visitor types gets a scripted answer. */
export function LiveDemo({ name, theme = 'void', props, title, onReady }: LiveDemoProps) {
  return <Tree name={name} theme={theme} overrides={props} title={title} onReady={onReady} />
}
