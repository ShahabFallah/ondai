'use client'
import { useState, type CSSProperties } from 'react'
import { ThinkingOrb, type OrbState } from '@/components/fx/ThinkingOrb'
import { useMicrophone, VoiceGlow } from '@/components/fx/VoiceGlow'
import { ImageReveal } from '@/components/fx/ImageReveal'
import { AsciiCanvas } from '@/components/fx/AsciiCanvas'

/** Dev page for the Canvas 2D effects. No site chrome. */

const STATES: OrbState[] = ['idle', 'thinking', 'listening', 'speaking', 'done']
const IMAGES = ['/img/fx/chip.png', '/img/fx/phone.png', '/img/fx/field.png']

const page: CSSProperties = { minHeight: '100vh', background: '#07080A', color: '#EDEFF2', padding: '48px 32px 96px', fontFamily: 'var(--font-sans)' }
const h2: CSSProperties = { fontSize: 20, fontWeight: 500, margin: '56px 0 20px', letterSpacing: 0 }
const label: CSSProperties = { fontSize: 13, color: '#9BA1A9' }
const stage: CSSProperties = { background: '#0E1013', borderRadius: 20, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 1px 0 rgba(255,255,255,.05)', padding: 24 }
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }

export default function OrbDevPage() {
  const [level, setLevel] = useState(0.5)
  const [processing, setProcessing] = useState(false)
  const [active, setActive] = useState(true)
  const [progress, setProgress] = useState(0.35)
  const [drift, setDrift] = useState(true)
  const [orbSpeed, setOrbSpeed] = useState(1)
  const mic = useMicrophone()

  return (
    <main style={page} data-fx-page>
      <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>fx / orb</h1>
      <p style={{ ...label, marginTop: 6 }}>ThinkingOrb, VoiceGlow, ImageReveal, AsciiCanvas. Canvas 2D, no dependencies.</p>

      <h2 style={h2}>ThinkingOrb</h2>
      <div style={{ ...row, marginBottom: 16 }}>
        <span style={label}>speed {orbSpeed.toFixed(2)}</span>
        <input type="range" min={0.25} max={2} step={0.05} value={orbSpeed} onChange={(e) => setOrbSpeed(Number(e.target.value))} style={{ width: 200 }} />
      </div>
      <div style={{ ...stage, display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', rowGap: 28, columnGap: 16, alignItems: 'center' }} data-shot="orbs">
        <span />
        {STATES.map((s) => (
          <span key={s} style={{ ...label, textAlign: 'center' }}>
            {s}
          </span>
        ))}
        {[200, 64, 20].map((size) => (
          <OrbRow key={size} size={size} speed={orbSpeed} />
        ))}
      </div>
      <div style={{ ...row, marginTop: 16 }}>
        <span style={label}>inline at 20:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <ThinkingOrb size={20} state="thinking" speed={orbSpeed} /> Thinking about your question
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <ThinkingOrb size={20} state="done" speed={orbSpeed} label="Done" /> Done
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <ThinkingOrb size={20} state="listening" level={level} speed={orbSpeed} /> Listening (slider below)
        </span>
      </div>

      <h2 style={h2}>VoiceGlow</h2>
      <div style={{ ...row, marginBottom: 20 }}>
        <span style={label}>level {level.toFixed(2)}</span>
        <input type="range" min={0} max={1} step={0.01} value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ width: 240 }} />
        <label style={{ ...label, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={processing} onChange={(e) => setProcessing(e.target.checked)} /> processing
        </label>
        <label style={{ ...label, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> active
        </label>
        <button
          type="button"
          onClick={() => (mic.active ? mic.stop() : void mic.start())}
          style={{ height: 32, padding: '0 12px', borderRadius: 8, background: mic.active ? '#EDEFF2' : 'rgba(255,255,255,.08)', color: mic.active ? '#07080A' : '#EDEFF2', fontSize: 13, fontWeight: 500 }}
        >
          {mic.active ? 'Stop microphone' : 'Use microphone'}
        </button>
        {mic.error && <span style={{ ...label, color: '#FF5C6C' }}>{mic.error}</span>}
      </div>
      <div style={{ ...stage, padding: 48 }} data-shot="voice">
        <VoiceGlow level={mic.active ? mic.level : level} processing={processing} active={active} radius={16} className="mx-auto" >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 56,
              padding: '0 8px 0 20px',
              borderRadius: 16,
              background: '#15181C',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.05)',
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            <ThinkingOrb size={22} state={processing ? 'thinking' : mic.active || level > 0.05 ? 'listening' : 'idle'} level={mic.active ? mic.level : level} />
            <input
              placeholder="Ask anything"
              style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#EDEFF2', fontSize: 15, minWidth: 0 }}
            />
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#9BA1A9', fontSize: 12 }}>mic</span>
          </div>
        </VoiceGlow>
      </div>
      <div style={{ ...stage, padding: 48, marginTop: 16 }}>
        <VoiceGlow stream={mic.stream} processing={processing} active={mic.active} radius={999}>
          <div style={{ height: 48, padding: '0 20px', borderRadius: 999, background: '#15181C', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', color: '#9BA1A9', fontSize: 14 }}>
            {mic.active ? 'Listening through the microphone stream' : 'Pill input, driven by the microphone stream when on'}
          </div>
        </VoiceGlow>
      </div>

      <h2 style={h2}>ImageReveal</h2>
      <div style={{ ...row, marginBottom: 20 }}>
        <span style={label}>progress {progress.toFixed(2)}</span>
        <input type="range" min={0} max={1} step={0.005} value={progress} onChange={(e) => setProgress(Number(e.target.value))} style={{ width: 320 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }} data-shot="reveal">
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>mosaic, cell 10, 640×400</p>
          <ImageReveal src="/img/fx/field.png" alt="Ion field" mode="mosaic" progress={progress} cell={10} width={640} height={400} style={{ borderRadius: 14, maxWidth: '100%' }} />
        </div>
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>ascii, cell 10, 640×400</p>
          <ImageReveal src="/img/fx/field.png" alt="Ion field" mode="ascii" progress={progress} cell={10} width={640} height={400} style={{ borderRadius: 14, maxWidth: '100%' }} />
        </div>
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>auto, mosaic, three images, fills the container</p>
          <ImageReveal images={IMAGES} src={IMAGES[0]} alt="Device renders" mode="mosaic" progress="auto" cell={12} style={{ borderRadius: 14 }} />
        </div>
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>auto, ascii, cell 8</p>
          <ImageReveal images={[IMAGES[1], IMAGES[0]]} src={IMAGES[1]} alt="Device renders" mode="ascii" progress="auto" cell={8} style={{ borderRadius: 14 }} />
        </div>
      </div>

      <h2 style={h2}>AsciiCanvas</h2>
      <div style={{ ...row, marginBottom: 20 }}>
        <label style={{ ...label, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={drift} onChange={(e) => setDrift(e.target.checked)} /> drift
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }} data-shot="ascii">
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>mono, cell 10, drift {drift ? 'on' : 'off'}</p>
          <AsciiCanvas src="/img/fx/chip.png" cell={10} drift={drift} width={640} height={400} style={{ maxWidth: '100%' }} label="A chip rendered as characters" />
        </div>
        <div style={stage}>
          <p style={{ ...label, marginBottom: 12 }}>image colours, cell 8, drift {drift ? 'on' : 'off'}</p>
          <AsciiCanvas src="/img/fx/phone.png" cell={8} colorMode="image" drift={drift} width={640} height={400} style={{ maxWidth: '100%' }} />
        </div>
        <div style={{ ...stage, position: 'relative', minHeight: 320, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            <AsciiCanvas src="/img/fx/phone.png" cell={9} drift={drift} />
          </div>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <p style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.15, margin: 0 }}>As a background texture.</p>
            <p style={{ ...label, marginTop: 10 }}>The canvas fills its container with cover fit and stays quiet behind copy.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

function OrbRow({ size, speed }: { size: number; speed: number }) {
  return (
    <>
      <span style={label}>{size} px</span>
      {STATES.map((s) => (
        <div key={s} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: size + 16 }}>
          <ThinkingOrb size={size} state={s} speed={speed} label={`${s} orb`} />
        </div>
      ))}
    </>
  )
}
