import { mockScript } from '@ondai/core/mock'
import { definePlayground, select } from '@ondai/playground'
import { RewriteDemo } from './rewrite.demo'
import { sampleFixed, sampleFormal, sampleShorter } from './sample-data'

export default definePlayground({
  name: 'rewrite',
  title: 'Rewrite',
  category: 'text',
  description: 'Shorten, expand, friendlier, formal or fix grammar. Toolbar, menu or chips; replace, diff or side-by-side results with accept/reject.',
  component: RewriteDemo,
  controls: {
    presentation: select(['toolbar', 'menu', 'chips'], 'toolbar', 'Presentation'),
    resultView: select(['replace', 'diff', 'sideBySide'], 'replace', 'Result view'),
  },
  variantKeys: ['presentation', 'resultView'],
  states: {
    idle: {},
    thinking: { script: mockScript.thinking(60_000), props: { initialMode: 'shorten' } },
    streaming: { script: mockScript.thinking(300).stream(sampleShorter, 45), props: { initialMode: 'shorten' }, freezeAt: 1400 },
    done: { script: mockScript.thinking(200).stream(sampleFixed, 500), props: { initialMode: 'fix' }, freezeAt: 3000 },
    formal: { script: mockScript.thinking(200).stream(sampleFormal, 500), props: { initialMode: 'formal' }, freezeAt: 3000 },
    error: { script: mockScript.error('context-overflow'), props: { initialMode: 'expand' } },
    refusal: { script: mockScript.refusal(), props: { initialMode: 'friendlier' } },
  },
  review: ['idle', 'streaming', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
})
