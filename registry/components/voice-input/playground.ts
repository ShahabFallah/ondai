import { definePlayground, select, text } from '@ondai/playground'
import { VoiceInputDemo } from './voice-input.demo'

export default definePlayground({
  name: 'voice-input',
  title: 'VoiceInput',
  category: 'voice',
  description: 'Push-to-talk that transcribes on device. A round mic, a rippling waveform or a soft bloom while you speak, a slow sweep while the model transcribes, then the transcript with Use and Retry.',
  component: VoiceInputDemo,
  controls: {
    presentation: select(['pill', 'card'], 'pill', 'Presentation'),
    visual: select(['bars', 'glow'], 'bars', 'Visual'),
    mode: select(['hold', 'tap'], 'hold', 'Mode'),
    label: text('', 'Label'),
  },
  variantKeys: ['presentation', 'visual'],
  states: {
    idle: { props: { stage: 'idle' }, description: 'Hold the mic to talk.' },
    listening: { props: { stage: 'listening' }, description: 'The waveform follows the voice; a simulated recorder speaks here.' },
    thinking: { props: { stage: 'thinking' }, description: 'The bars settle into a slow sweep while Apple SpeechAnalyzer transcribes.' },
    done: { props: { stage: 'done' }, freezeAt: 1500, description: 'Transcript with Use and Retry.' },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { stage: 'idle' }, description: 'No transcription provider on this device.' },
  },
  review: ['idle', 'listening', 'done'],
  frame: { width: 360, padding: 24, background: 'bg' },
  code: (p) => {
    const attrs: string[] = []
    if (p.presentation !== 'pill') attrs.push(`presentation="${p.presentation}"`)
    if (p.visual !== 'bars') attrs.push(`visual="${p.visual}"`)
    if (p.mode !== 'hold') attrs.push(`mode="${p.mode}"`)
    if (p.label) attrs.push(`label="${p.label}"`)
    attrs.push('recorder={recorder}', 'onTranscript={(text) => setQuery(text)}')
    return `<VoiceInput\n  ${attrs.join('\n  ')}\n/>`
  },
})
