'use client'
import { Check, Mic, Pencil, Play, Search, Wrench } from 'lucide-react'
import { AppleMark } from '@/components/site/BrandMarks'
import { Bar, Phone, Stage } from '../kit'
import './hero.css'

// The picture under the home hero, as a transparent PNG over the page's own window light.
//
// Three things the phone's own model does, read in one look, each a real Ondai component:
// - the phone (CommandBar and ToolConfirmCard): a plain request has become an event waiting for an OK;
// - lower left (ScanToData): a receipt photo has become an expense;
// - lower right (VoiceMemo): a spoken memo has become to-dos.
// A small chip names the model that ran all three. The phone is pinned from the top and dissolves at
// its foot into the page (a mask, so the PNG's alpha stays true); the two cards straddle its edges over
// the agenda filler, never over the confirm card. The phone-column crop keeps the phone and the memo.

const REQUEST = "Dinner with Marco on Saturday at 8 at Luigi's"

function Screen() {
  return (
    <div className="hs-screen">
      <div className="hs-head">
        <Bar w={92} h={8} r={4} tone={3} />
        <div className="hs-title">Today</div>
      </div>

      {/* CommandBar: the request, typed or spoken, in plain words */}
      <div className="hs-command">
        <Search className="hs-command-icon" size={20} strokeWidth={1.75} aria-hidden />
        <div className="hs-command-text">
          {REQUEST}
          <span className="hs-caret" />
        </div>
        <Mic className="hs-command-icon" size={20} strokeWidth={1.75} aria-hidden />
      </div>

      {/* ToolConfirmCard: the structured result, waiting for an OK */}
      <div className="hs-tool">
        <Wrench size={15} strokeWidth={1.75} aria-hidden />
        <span>Wants to run</span>
        <code>createEvent</code>
        <span className="hs-muted">Needs your OK</span>
      </div>
      <div className="hs-confirm">
        <div className="hs-confirm-title">Create the event?</div>
        <dl className="hs-fields">
          <dt>Title</dt>
          <dd>Dinner with Marco</dd>
          <dt>When</dt>
          <dd>Sat, 8:00 PM</dd>
          <dt>Where</dt>
          <dd>Luigi&apos;s Trattoria</dd>
        </dl>
        <div className="hs-actions">
          <span className="hs-edit">
            <Pencil size={15} strokeWidth={1.75} aria-hidden />
            Edit
          </span>
          <span className="hs-btn">Deny</span>
          <span className="hs-btn hs-btn--primary">Confirm</span>
        </div>
      </div>

      {/* The rest of the day: filler, under the fade */}
      <div className="hs-agenda">
        <Bar w={64} h={7} r={3.5} tone={3} />
        {[
          [118, 74],
          [146, 60],
          [104, 82],
          [132, 66],
        ].map(([a, b], i) => (
          <div key={i} className="hs-slot">
            <Bar w={36} h={8} r={4} tone={2} />
            <div className="hs-slot-lines">
              <Bar w={a} h={9} r={4.5} tone={4} />
              <Bar w={b} h={7} r={3.5} tone={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** A receipt on a dark counter, as the camera saw it: paper, printed lines, a total. */
function ReceiptPhoto() {
  return (
    <div className="hs-photo" aria-hidden>
      <div className="hs-paper">
        <Bar w={58} h={6} r={3} tone={4} />
        <Bar w={40} h={4} r={2} tone={2} />
        <div className="hs-paper-rows">
          {[
            [70, 22],
            [54, 18],
            [62, 22],
          ].map(([a, b], i) => (
            <div key={i} className="hs-paper-row">
              <Bar w={a} h={4} r={2} tone={3} />
              <Bar w={b} h={4} r={2} tone={3} />
            </div>
          ))}
        </div>
        <div className="hs-paper-total">
          <Bar w={34} h={5} r={2.5} tone={4} />
          <Bar w={26} h={5} r={2.5} tone={4} />
        </div>
      </div>
    </div>
  )
}

/** ScanToData: the photo, then the details the model read off it. */
function Scan() {
  return (
    <div className="hs-card hs-scan">
      <ReceiptPhoto />
      <div className="hs-scan-body">
        <div className="hs-found">
          <span className="hs-tick">
            <Check size={13} strokeWidth={2.5} aria-hidden />
          </span>
          <span className="hs-found-text">Found 3 details</span>
          <span className="hs-muted">from your receipt</span>
        </div>
        <dl className="hs-rows">
          <dt>Merchant</dt>
          <dd>Blue Bottle Coffee</dd>
          <dt>Total</dt>
          <dd>$12.40</dd>
          <dt>Category</dt>
          <dd>Coffee</dd>
        </dl>
      </div>
    </div>
  )
}

/** A voice memo's level, one bar per beat, the same every render. */
const WAVE = Array.from({ length: 44 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.55) * 0.6 + Math.sin(i * 1.7 + 1) * 0.3 + Math.sin(i * 0.19) * 0.25)
  return Math.round(4 + v * 18)
})

/** VoiceMemo: what was said, then the to-dos it turned into. */
function Memo() {
  return (
    <div className="hs-card hs-memo">
      <div className="hs-memo-head">
        <span className="hs-memo-play">
          <Play size={12} strokeWidth={0} fill="currentColor" aria-hidden />
        </span>
        <span className="hs-memo-title">Venue call for Friday</span>
        <span className="hs-muted hs-memo-time">0:42</span>
      </div>
      <div className="hs-wave" aria-hidden>
        {WAVE.map((h, i) => (
          <span key={i} style={{ height: h }} />
        ))}
      </div>
      <ul className="hs-todos">
        {['Send Sam the deposit form', 'Ask Priya for the budget', 'Book the projector'].map((t) => (
          <li key={t}>
            <span className="hs-box">
              <Check size={11} strokeWidth={3} aria-hidden />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModelChip() {
  return (
    <div className="hs-chip">
      <AppleMark className="hs-chip-mark" size={18} />
      <span className="hs-chip-text">
        <span className="hs-chip-name">Apple Foundation Models</span>
        <span className="hs-muted">On device · 0.4 s</span>
      </span>
    </div>
  )
}

export function HeroShot({ dark, compact }: { dark: boolean; compact?: boolean }) {
  const w = compact ? 390 : 1040
  const h = compact ? 720 : 810
  return (
    <Stage width={w} height={h} theme={dark ? 'dark' : 'light'} palette="mono" fidelity="standard" className="hs">
      {() => (
        <div className="hs-root" data-dark={dark || undefined} data-compact={compact || undefined}>
          <Phone width={compact ? 344 : 372} dark={dark} className="hs-phone">
            <Screen />
          </Phone>
          {!compact && <Scan />}
          <Memo />
          {!compact && <ModelChip />}
        </div>
      )}
    </Stage>
  )
}
