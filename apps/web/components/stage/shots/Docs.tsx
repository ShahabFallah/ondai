'use client'
import { Cloud, Route } from 'lucide-react'
import type { ReactNode } from 'react'
import { AppleMark, GoogleMark, MetaMark } from '@/components/site/BrandMarks'
import { Bar, Caret, Code, Connector, Phone, Prompt, Stage, Window } from '../kit'
import './docs.css'

// The Docs menu's pictures: one per guide, 4:3, on the same blurred wall of window light as the
// Components menu's stills. Designed at 360 × 270 (the size the menu shows them) and shot at 4x, so
// the type reads at its true size in the menu. Each is one object, cropped hard, with at most one
// satellite; ink and paper only, the makers' own marks where a provider is named.

function Ground({ dark }: { dark: boolean }) {
  const photo = `/img/stills/src-phone-${dark ? 'dark' : 'light'}.png`
  return <div className="ds-ground" style={{ backgroundImage: `url(${photo})` }} />
}

/* installation: the two commands, and what they wrote */
function Installation() {
  return (
    <Window chrome="terminal" lights="grey" title="~/my-app" className="ds-term">
      <Prompt path="~/my-app">npx ondai init</Prompt>
      <div>
        <span className="ok">✓</span> Expo 54 · npm
      </div>
      <div>
        <span className="ok">✓</span> wrote <span className="ds-file">ondai.json</span>
      </div>
      <Prompt path="~/my-app">npx ondai add command-bar</Prompt>
      <div>
        <span className="ok">✓</span> wrote <span className="ds-file">components/ondai/command-bar.tsx</span>
      </div>
      <Prompt path="~/my-app">
        <Caret still />
      </Prompt>
    </Window>
  )
}

/* how-it-works: your component asks, the router picks, the phone's model answers */
function HowItWorks() {
  return (
    <>
      <div className="ds-node ds-node--source">
        <code>
          &lt;<b>Summarize</b> text={'{note}'} /&gt;
        </code>
      </div>
      <div className="ds-node ds-node--router">
        <Route size={14} strokeWidth={1.75} aria-hidden />
        <span>Router</span>
      </div>
      <Phone width={212} className="ds-hiw-phone">
        <div className="ds-hiw-screen">
          <div className="ds-hiw-model">
            <AppleMark size={30} />
            <span>
              <b>Apple Foundation Models</b>
              <span className="ds-muted">Answering on this iPhone</span>
            </span>
          </div>
          <Bar w="86%" h={12} r={6} tone={3} />
          <Bar w="64%" h={12} r={6} tone={3} />
        </div>
      </Phone>
      <Connector from={{ x: 180, y: 57 }} to={{ x: 180, y: 79 }} route="straight" show arrow className="ds-line" />
      <Connector from={{ x: 180, y: 114 }} to={{ x: 180, y: 140 }} route="straight" show arrow className="ds-line" />
    </>
  )
}

/* core: the hooks in a component file, beside the status they read */
function Core() {
  return (
    <>
      <Window title="Planner.tsx" lights="grey" className="ds-code-win">
        <Code
          className="ds-code"
          lines={[
            'export function Planner() {',
            '  const { status } = useAvailability()',
            '  const ai = useOndai()',
            '',
            "  if (status !== 'ready') return null",
            '  return <PlanView ai={ai} />',
            '}',
          ]}
        />
      </Window>
      <div className="ds-status">
        <span className="ds-dot" />
        <span>
          <b>status</b>
          <span className="ds-muted"> ready</span>
        </span>
        <span className="ds-sep" />
        <AppleMark size={13} />
        <span className="ds-muted">Apple</span>
      </div>
    </>
  )
}

/* providers: the three on-device makers, one ready on this phone */
function ProviderRow({ mark, name, line, end }: { mark: ReactNode; name: string; line: string; end: ReactNode }) {
  return (
    <div className="ds-prov">
      <span className="ds-prov-mark">{mark}</span>
      <span className="ds-prov-text">
        <b>{name}</b>
        <span className="ds-muted">{line}</span>
      </span>
      {end}
    </div>
  )
}
function Providers() {
  return (
    <div className="ds-card ds-provs">
      <ProviderRow mark={<AppleMark size={18} />} name="Apple Foundation Models" line="iPhone 15 Pro and later" end={<span className="ds-pill ds-pill--on">Ready</span>} />
      <ProviderRow mark={<GoogleMark size={16} />} name="Gemini Nano" line="Pixel 9, Galaxy S25" end={<span className="ds-pill">Android</span>} />
      <ProviderRow mark={<MetaMark size={18} />} name="Llama 3.2" line="Any recent phone" end={<span className="ds-pill">Download</span>} />
      <ProviderRow mark={<Cloud size={16} strokeWidth={1.75} />} name="Cloud" line="Your own endpoint" end={<span className="ds-pill">Fallback</span>} />
    </div>
  )
}

/* theming: one component, light on the left and dark on the right */
function ConfirmCard({ tone }: { tone: 'light' | 'dark' }) {
  return (
    <div className="ds-theme-card" data-tone={tone}>
      <div className="ds-theme-title">Create the event?</div>
      <dl className="ds-theme-fields">
        <dt>Title</dt>
        <dd>Dinner with Marco</dd>
        <dt>When</dt>
        <dd>Sat, 8:00 PM</dd>
        <dt>Where</dt>
        <dd>Luigi&apos;s Trattoria</dd>
      </dl>
      <div className="ds-theme-actions">
        <span className="ds-btn">Deny</span>
        <span className="ds-btn ds-btn--primary">Confirm</span>
      </div>
    </div>
  )
}
function Theming() {
  return (
    <div className="ds-theme">
      <ConfirmCard tone="light" />
      <ConfirmCard tone="dark" />
    </div>
  )
}

/* device-support: the phones that ship a model */
function DeviceScreen({ device, mark, model }: { device: string; mark: ReactNode; model: string }) {
  return (
    <div className="ds-dev-screen">
      <div className="ds-dev-name">{device}</div>
      <div className="ds-dev-model">
        {mark}
        <span>{model}</span>
      </div>
      <span className="ds-dev-ready">Model ready</span>
      <div className="ds-dev-rows">
        <Bar w="92%" h={16} r={8} tone={3} />
        <Bar w="70%" h={16} r={8} tone={3} />
        <Bar w="80%" h={16} r={8} tone={2} />
      </div>
    </div>
  )
}
function DeviceSupport({ dark }: { dark: boolean }) {
  return (
    <>
      <Phone width={150} dark={dark} className="ds-dev ds-dev--a">
        <DeviceScreen device="iPhone 16 Pro" mark={<AppleMark size={34} />} model="Apple Foundation Models" />
      </Phone>
      <Phone width={150} frame="android" dark={dark} className="ds-dev ds-dev--b">
        <DeviceScreen device="Pixel 9" mark={<GoogleMark size={30} />} model="Gemini Nano" />
      </Phone>
    </>
  )
}

export function DocsShot({ name, dark }: { name: string; dark: boolean }) {
  return (
    <Stage width={360} height={270} theme={dark ? 'dark' : 'light'} palette="mono" fidelity="realistic" className="ds">
      {() => (
        <div className="ds-root" data-dark={dark || undefined} data-shot={name}>
          <Ground dark={dark} />
          {name === 'installation' && <Installation />}
          {name === 'how-it-works' && <HowItWorks />}
          {name === 'core' && <Core />}
          {name === 'providers' && <Providers />}
          {name === 'theming' && <Theming />}
          {name === 'device-support' && <DeviceSupport dark={dark} />}
        </div>
      )}
    </Stage>
  )
}
