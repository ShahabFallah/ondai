'use client'
import dynamic from 'next/dynamic'

const SpikeTree = dynamic(() => import('./SpikeTree'), { ssr: false, loading: () => <p style={{ padding: 32 }}>loading…</p> })

export default function SpikeClient() {
  return <SpikeTree />
}
