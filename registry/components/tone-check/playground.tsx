import { Text, View } from 'react-native'
import { BadgeCheck, CircleAlert, Flame, Laugh, Undo2, Wand2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { ToneCheckDemo } from './tone-check.demo'
import { toneColor, type ToneCheckIcons, type ToneCheckLabels, type ToneMeterProps } from './tone-check'
import { sampleBlunt, sampleBluntReading, sampleFriendly, sampleFriendlyReading, sampleNeutral, sampleNeutralReading, sampleSofter, sampleTense, sampleTenseReading, sampleTenseSofter } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

/** The reading call gets the scripted reading; the softer call (its system asks to rewrite) streams the softer text. */
const script = (reading: object, softer = sampleSofter, tps = 400) => (call: { system?: string }) =>
  /rewrite the message/i.test(call.system ?? '') ? mockScript.thinking(150).stream(softer, tps) : mockScript.thinking(400).object(reading)

const iconSets: Record<string, Partial<ToneCheckIcons>> = {
  default: {},
  alternate: { friendly: Laugh, neutral: BadgeCheck, blunt: CircleAlert, tense: Flame, soften: Wand2, reject: Undo2 },
  none: { friendly: null, neutral: null, blunt: null, tense: null, soften: null, accept: null, retry: null },
}

const copy: Record<string, Partial<ToneCheckLabels>> = {
  default: {},
  terse: { thinking: 'Reading', softening: 'Softening', softer: 'Softer', accept: 'Use', reject: 'Keep', soften: 'Soften', idle: 'Type to see the tone.' },
  italiano: {
    title: 'Tono',
    friendly: 'Cordiale',
    neutral: 'Neutro',
    blunt: 'Brusco',
    tense: 'Teso',
    warm: 'Caldo',
    sharp: 'Tagliente',
    casual: 'Informale',
    formal: 'Formale',
    formality: 'Formalità',
    thinking: 'Leggo il tono',
    softening: 'Cerco un modo più gentile',
    idle: 'Inizia a scrivere e il tono appare qui.',
    softer: 'Un modo più gentile per dirlo',
    soften: 'Ammorbidisci',
    accept: 'Usa questo',
    reject: 'Tengo il mio',
    retry: 'Riprova',
    preparing: 'Preparo il modello',
  },
}

/** A meter drawn through the `renderMeter` slot: one word and a percentage, no tracks. */
function WordMeter({ reading, stale }: ToneMeterProps) {
  const t = useTheme()
  if (!reading) return null
  return (
    <View style={{ flexDirection: 'row', gap: 8, opacity: stale ? 0.5 : 1 }}>
      <Text style={[typeStyle(t, 'sm', { weight: 'semibold' }), { color: toneColor(t, reading.tone).ink }]}>{reading.tone.toUpperCase()}</Text>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{`${Math.round(reading.formality * 100)}% formal`}</Text>
    </View>
  )
}

export default definePlayground({
  name: 'tone-check',
  title: 'ToneCheck',
  category: 'text',
  description: 'Reads the tone of a draft as you type, friendly to tense and casual to formal, and offers a one-tap softer rewrite when it reads off.',
  component: ToneCheckDemo,
  controls: {
    variant: select(skinNames, 'bevel', 'Variant'),
    presentation: select(['card', 'pill'], 'card', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    suggest: select(['auto', 'tap', 'off'], 'auto', 'Suggest'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    meterStyle: select(['default', 'words'], 'default', 'Meter (renderMeter)'),
    showBadge: boolean(true, 'Badge'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    idle: { props: { value: '' }, description: 'Nothing typed yet: the meters wait, dimmed.' },
    thinking: { script: mockScript.thinking(60_000), props: { value: sampleNeutral } },
    done: { script: script(sampleFriendlyReading), props: { value: sampleFriendly }, freezeAt: 1500, description: 'A friendly draft: the reading, no suggestion.' },
    neutral: { script: script(sampleNeutralReading), props: { value: sampleNeutral }, freezeAt: 1500 },
    suggesting: { script: script(sampleBluntReading), props: { value: sampleBlunt }, freezeAt: 3000, description: 'A blunt draft with a softer version one tap away.' },
    tense: { script: script(sampleTenseReading, sampleTenseSofter), props: { value: sampleTense }, freezeAt: 3000 },
    tap: { script: script(sampleBluntReading), props: { value: sampleBlunt, suggest: 'tap' }, freezeAt: 1500, description: 'With suggest="tap" the softer version waits for the Soften key.' },
    error: { script: mockScript.error('unknown'), props: { value: sampleBlunt } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { value: sampleBlunt } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 }, props: { value: sampleBlunt } },
  },
  review: ['idle', 'done', 'suggesting'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p, ctx) => {
    const { tint, radius, icons, labels, meterStyle, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <ToneCheckDemo
        {...(rest as object)}
        // A new state or suggest mode starts from its own draft.
        key={`${ctx.state}-${rest.suggest as string}`}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        renderMeter={meterStyle === 'words' ? (m) => <WordMeter {...m} /> : undefined}
      />
    )
  },
})
