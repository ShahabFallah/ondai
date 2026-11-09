import { Text, View } from 'react-native'
import { Aperture, CircleCheck, ClipboardCopy, Images, RefreshCcw, Wand } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { PhotoCaption, type CaptionFieldProps, type PhotoCaptionIcons, type PhotoCaptionLabels } from './photo-caption'
import type { CaptionTone } from './prompts'
import { samplePhoto, sampleReplies } from './sample-data'

/** The scripted reply in the tone the component asked for, so the Tone control shows its own voice. */
const byTone = (call: { system?: string }): string => {
  const sys = (call.system ?? '').toLowerCase()
  const tone: CaptionTone = sys.includes('playful') ? 'playful' : sys.includes('warm') ? 'warm' : 'plain'
  return sampleReplies[tone]
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<PhotoCaptionIcons>> = {
  default: {},
  alternate: { camera: Aperture, library: Images, run: Wand, copy: ClipboardCopy, copied: CircleCheck, again: RefreshCcw },
  none: { empty: null, camera: null, library: null, run: null, copy: null, copied: null, useAlt: null, again: null, retry: null },
}

const copy: Record<string, Partial<PhotoCaptionLabels>> = {
  default: {},
  terse: { caption: 'Caption', alt: 'Alt', run: 'Describe', thinking: 'Looking', useAlt: 'Use alt', usedAlt: 'Set', idle: 'Caption + alt text, on device.' },
  italiano: {
    caption: 'Didascalia',
    alt: 'Testo alternativo',
    empty: 'Aggiungi una foto',
    idle: 'Didascalia e testo alternativo, scritti su questo dispositivo.',
    takePhoto: 'Scatta',
    choosePhoto: 'Scegli foto',
    run: 'Descrivi la foto',
    thinking: 'Guardo la foto',
    copy: 'Copia',
    copied: 'Copiato',
    useAlt: 'Usa come alt',
    usedAlt: 'Alt impostato',
    again: 'Descrivi di nuovo',
    retry: 'Riprova',
    error: 'Non riesco a descrivere questa foto',
    preparing: 'Preparo il modello',
    tooLong: 'Gli screen reader preferiscono meno di {max} caratteri.',
  },
}

/** An output block drawn by the app, through `renderField`. */
function QuoteField({ label, value }: CaptionFieldProps) {
  const t = useTheme()
  return (
    <View style={{ gap: 2, borderLeftWidth: 2, borderLeftColor: t.colors.hairlineStrong, paddingLeft: 10 }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{label}</Text>
      <Text style={[typeStyle(t, 'md'), { color: t.colors.text }]}>{value || '…'}</Text>
    </View>
  )
}

export default definePlayground({
  name: 'photo-caption',
  title: 'PhotoCaption',
  category: 'vision',
  description: 'A photo in; a caption and accessibility alt text out, from the on-device vision model. Both stream in, both are editable, and the alt text goes back to your app.',
  component: PhotoCaption,
  controls: {
    variant: select(skinNames, 'bevel', 'Variant'),
    presentation: select(['stacked', 'tabs'], 'stacked', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tone: select(['plain', 'warm', 'playful'], 'plain', 'Tone'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    fields: select(['default', 'quote'], 'default', 'Fields (renderField)'),
    editable: boolean(true, 'Editable'),
    showBadge: boolean(true, 'Badge'),
    showActions: boolean(true, 'Use and again keys'),
  },
  variantKeys: ['variant', 'presentation', 'size', 'tone'],
  states: {
    idle: { props: { autoRun: false }, description: 'A photo is in, nothing written yet: the describe key.' },
    empty: { props: { image: undefined }, description: 'No photo yet: take or choose one.' },
    thinking: { script: mockScript.thinking(60_000), description: 'The model looks at the photo.' },
    streaming: { script: (call) => mockScript.thinking(300).stream(byTone(call), 30), freezeAt: 1500, description: 'The caption streams in, then the alt text below it.' },
    done: { script: (call) => mockScript.thinking(200).stream(byTone(call), 400), freezeAt: 2500, description: 'Both outputs, editable, with copy and use-as-alt-text.' },
    error: { script: mockScript.error('unknown', 'The model could not read this image.') },
    refusal: { script: mockScript.refusal('The on-device model declined to describe this photo.') },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 } },
  },
  review: ['idle', 'thinking', 'streaming', 'done', 'refusal'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p, ctx) => {
    const { tint, radius, icons, labels, fields, ...rest } = p as typeof p & Record<string, unknown>
    // Remount when the tone changes so the photo is described again in the new voice.
    const key = `${ctx.state}-${p.tone as string}`
    const image = 'image' in p ? (p.image as typeof samplePhoto | undefined) : samplePhoto
    return (
      <PhotoCaption
        {...(rest as object)}
        key={key}
        image={image}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        renderField={fields === 'quote' ? (f) => <QuoteField {...f} /> : undefined}
        onUseAlt={() => {}}
      />
    )
  },
})
