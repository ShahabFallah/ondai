import { AudioLines, Check, CirclePause, Undo2 } from 'lucide-react-native'
import { definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { VoiceInputDemo } from './voice-input.demo'
import type { VoiceInputIcons, VoiceInputLabels } from './voice-input'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<VoiceInputIcons>> = {
  default: {},
  alternate: { mic: AudioLines, stop: CirclePause, retry: Undo2, use: Check },
  none: { retry: null },
}

const copy: Record<string, Partial<VoiceInputLabels>> = {
  default: {},
  terse: { holdHint: 'Hold', tapHint: 'Tap', listening: 'On air', transcribing: 'Writing', use: 'Keep', retry: 'Again', voice: 'Mic', transcript: 'Heard', prompt: 'Go ahead.' },
  italiano: {
    holdHint: 'Tieni premuto per parlare',
    tapHint: 'Tocca per parlare',
    listening: 'Ti ascolto',
    transcribing: 'Trascrivo',
    releaseToStop: 'Rilascia per fermare',
    tapToStop: 'Tocca per fermare',
    prompt: 'Dimmi cosa ti serve.',
    voice: 'Voce',
    transcript: 'Trascrizione',
    use: 'Usa',
    retry: 'Riprova',
    unavailable: 'La trascrizione non è disponibile su questo dispositivo.',
    start: 'Inizia ad ascoltare',
    stop: 'Smetti di ascoltare',
  },
}

export default definePlayground({
  name: 'voice-input',
  title: 'VoiceInput',
  category: 'voice',
  description: 'Push-to-talk that transcribes on device. The mic is the variant’s key, a waveform drawn in the variant follows the voice, then the transcript comes back with Use and Retry.',
  component: VoiceInputDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['pill', 'card'], 'pill', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    visual: select(['bars', 'glow'], 'bars', 'Visual'),
    mode: select(['hold', 'tap'], 'hold', 'Mode'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '12', '18', '28'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    label: text('', 'Hint'),
  },
  variantKeys: ['variant', 'presentation', 'size', 'visual'],
  states: {
    idle: { props: { stage: 'idle' }, description: 'Hold the mic to talk.' },
    listening: { props: { stage: 'listening' }, description: 'The waveform follows the voice; a simulated recorder speaks here.' },
    thinking: { props: { stage: 'thinking' }, description: 'The bars settle into a slow sweep while Apple SpeechAnalyzer transcribes.' },
    done: { props: { stage: 'done' }, freezeAt: 1500, description: 'Transcript with Use and Retry.' },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { stage: 'idle' }, description: 'No transcription provider on this device.' },
  },
  review: ['idle', 'listening', 'done'],
  frame: { width: 360, padding: 24, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, label, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <VoiceInputDemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        label={(label as string) || undefined}
      />
    )
  },
  code: (p) => {
    const attrs: string[] = []
    if (p.variant !== 'clean') attrs.push(`variant="${p.variant}"`)
    if (p.presentation !== 'pill') attrs.push(`presentation="${p.presentation}"`)
    if (p.size !== 'md') attrs.push(`size="${p.size}"`)
    if (p.visual !== 'bars') attrs.push(`visual="${p.visual}"`)
    if (p.mode !== 'hold') attrs.push(`mode="${p.mode}"`)
    const hex = tints[p.tint as keyof typeof tints]
    if (hex) attrs.push(`tint="${hex}"`)
    if (p.radius !== 'auto') attrs.push(`radius={${p.radius}}`)
    if (p.label) attrs.push(`label="${p.label}"`)
    attrs.push('recorder={recorder}', 'onTranscript={(text) => setQuery(text)}')
    return `<VoiceInput\n  ${attrs.join('\n  ')}\n/>`
  },
})
