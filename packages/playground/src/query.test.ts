import { describe, expect, it } from 'vitest'
import { boolean, decodeQuery, definePlayground, encodeQuery, select, text, number, defaultCode } from './index'

const def = definePlayground({
  name: 'demo',
  title: 'Demo Thing',
  category: 'primitive',
  description: 'x',
  component: (() => null) as any,
  controls: { variant: select(['glass', 'solid'], 'glass'), big: boolean(false), label: text('Hi'), n: number(3, { min: 1 }) },
  states: { idle: {}, thinking: { freezeAt: 400 } },
})

describe('query codec', () => {
  it('round-trips non-default values and ignores junk', () => {
    const q = decodeQuery(def, new URLSearchParams('variant=solid&big=1&n=7&state=thinking&theme=paper&junk=1&t=400&clock=manual'))
    expect(q.props).toEqual({ variant: 'solid', big: true, label: 'Hi', n: 7 })
    expect(q.state).toBe('thinking')
    expect(q.theme).toBe('paper')
    expect(q.clock).toBe('manual')
    expect(q.t).toBe(400)
    const s = encodeQuery(def, q)
    expect(s).toBe('variant=solid&big=1&n=7&state=thinking&theme=paper&clock=manual&t=400')
    expect(decodeQuery(def, new URLSearchParams('variant=nope&state=nope')).props.variant).toBe('glass')
    expect(decodeQuery(def, new URLSearchParams('')).state).toBe('idle')
  })
  it('defaults and code', () => {
    expect(def.review).toEqual(['idle', 'thinking'])
    expect(defaultCode(def, { variant: 'solid', big: true, label: 'Hi', n: 3 })).toBe('<DemoThing\n  variant="solid"\n  big\n/>')
  })
})
