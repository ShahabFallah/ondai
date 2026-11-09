import { Pressable, Text } from 'react-native'
import { ArrowRightLeft, CircleCheck, ClipboardCopy, Globe, MoveRight, RotateCw } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { translateLanguages } from './prompts'
import { Translate, type TranslateIcons, type TranslateLabels, type TranslateLanguageProps } from './translate'
import { sampleMessage, sampleTranslations } from './sample-data'

type Target = 'it' | 'es' | 'de' | 'fr' | 'ja'
const targets: Target[] = ['it', 'es', 'de', 'fr', 'ja']

/** The scripted translation in the language the component asked for, read from the system prompt. */
const byLanguage = (call: { system?: string }): string => {
  const sys = call.system ?? ''
  const hit = translateLanguages.find((l) => l.code !== 'en' && sys.includes(`into ${l.name}`))
  return sampleTranslations[hit?.code ?? 'it'] ?? sampleTranslations.it!
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<TranslateIcons>> = {
  default: {},
  alternate: { title: Globe, direction: MoveRight, swap: ArrowRightLeft, copy: ClipboardCopy, copied: CircleCheck, retry: RotateCw },
  none: { title: null, direction: null, run: null, swap: null, copy: null, copied: null, retry: null },
}

const copy: Record<string, Partial<TranslateLabels>> = {
  default: {},
  terse: { run: 'Go', thinking: 'Translating', idle: 'Pick a language.', copy: 'Copy', swap: 'Swap', retry: 'Retry' },
  italiano: {
    run: 'Traduci',
    thinking: 'Traduco in {language}',
    idle: 'Scegli una lingua. Traduce su questo telefono.',
    empty: 'Niente da tradurre.',
    retry: 'Riprova',
    copy: 'Copia',
    copied: 'Copiato',
    swap: 'Inverti lingue',
    preparing: 'Preparo il modello',
    languages: 'Traduci in',
    source: 'Testo originale',
  },
}

/** A language drawn through the `renderLanguage` slot: plain words, underlined when picked. */
function TextLanguage({ language, selected, disabled, onPress }: TranslateLanguageProps) {
  const t = useTheme()
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected }} style={{ paddingHorizontal: 6, height: 28, justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={[typeStyle(t, 'sm', { weight: selected ? 'semibold' : 'regular' }), { color: selected ? t.colors.text : t.colors.textSecondary, textDecorationLine: selected ? 'underline' : 'none' }]}>{language.label}</Text>
    </Pressable>
  )
}

export default definePlayground({
  name: 'translate',
  title: 'Translate',
  category: 'text',
  description: 'Live translation on device. The original, a row of target languages and the translation streaming in, with copy and an instant swap.',
  component: Translate,
  controls: {
    variant: select(skinNames, 'bevel', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    to: select(targets, 'it', 'Target'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    chips: select(['default', 'text'], 'default', 'Languages (renderLanguage)'),
    showSource: boolean(true, 'Original text'),
    showBadge: boolean(true, 'Badge'),
    showActions: boolean(true, 'Copy and swap keys'),
  },
  variantKeys: ['variant', 'size', 'to'],
  states: {
    idle: { props: { autoRun: false }, description: 'Before the first run: the languages wait and the translate key shows.' },
    empty: { props: { text: '' }, description: 'Nothing to translate yet.' },
    thinking: { script: mockScript.thinking(60_000) },
    streaming: { script: (call) => mockScript.thinking(300).stream(byLanguage(call), 40), freezeAt: 1600 },
    done: { script: (call) => mockScript.thinking(200).stream(byLanguage(call), 400), freezeAt: 3000 },
    japanese: { script: (call) => mockScript.thinking(200).stream(byLanguage(call), 400), props: { to: 'ja' }, freezeAt: 3000, description: 'Into Japanese: a different script in the same card.' },
    error: { script: mockScript.error('context-overflow') },
    refusal: { script: mockScript.refusal() },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 } },
  },
  review: ['idle', 'thinking', 'streaming', 'done', 'refusal'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p, ctx) => {
    const { tint, radius, icons, labels, chips, ...rest } = p as typeof p & Record<string, unknown>
    const to = (p.to ?? 'it') as Target
    return (
      <Translate
        {...(rest as object)}
        // Remount when the target changes so the scripted run starts over in the new language.
        key={`${ctx.state}-${to}`}
        text={(p.text as string) ?? sampleMessage}
        to={to}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        renderLanguage={chips === 'text' ? (l) => <TextLanguage {...l} /> : undefined}
      />
    )
  },
})
