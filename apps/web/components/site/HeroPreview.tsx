'use client'
import { useEffect, useState } from 'react'

const states = ['idle', 'thinking', 'tool'] as const

/** A live CommandBar in an iPhone frame, cycling idle → thinking → tool on the scripted mock. */
export function HeroPreview() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const h = setInterval(() => setI((x) => (x + 1) % states.length), 4500)
    return () => clearInterval(h)
  }, [])
  const state = states[i]
  return (
    <div className="relative ondai-ion-glow rounded-[56px]" style={{ width: 330, height: 672 }}>
      <div className="absolute inset-0 overflow-hidden rounded-[56px]" style={{ background: '#15181C', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.6)' }}>
        <div className="absolute left-1/2 top-[18px] z-10 h-[28px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-[10px] overflow-hidden rounded-[46px] bg-[#07080A]">
          <iframe key={state} title="CommandBar preview" src={`/playground/command-bar?embed=1&state=${state}&presentation=sheet&frame=none`} className="h-full w-full border-0" style={{ transform: 'scale(0.78)', transformOrigin: 'top left', width: '128%', height: '128%' }} />
        </div>
      </div>
      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 ondai-mono text-[color:var(--ondai-text-tertiary)] whitespace-nowrap">simulated · airplane mode on</span>
    </div>
  )
}
