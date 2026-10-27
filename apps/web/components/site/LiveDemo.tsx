'use client'
import dynamic from 'next/dynamic'
import type { DemoName } from './demos'

const Tree = dynamic(() => import('./LiveDemoTree'), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden />,
})

/** A registry component, live, on the scripted mock. Everything the visitor types gets a scripted answer. */
export function LiveDemo({ name, theme = 'void' }: { name: DemoName; theme?: 'void' | 'paper' | 'glass' }) {
  return <Tree name={name} theme={theme} />
}
