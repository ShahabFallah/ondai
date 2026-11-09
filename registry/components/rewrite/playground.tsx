import { Pressable, Text } from 'react-native'
import { ArrowDownToLine, CheckCheck, Feather, GraduationCap, Heart, RotateCw, Scissors, Undo2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { RewriteDemo } from './rewrite.demo'
import type { RewriteIcons, RewriteLabels, RewriteModeProps } from './rewrite'
import { sampleFixed, sampleFormal, sampleShorter } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<RewriteIcons>> = {
  default: {},
  alternate: { shorten: Scissors, expand: ArrowDownToLine, friendlier: Heart, formal: GraduationCap, fix: CheckCheck, menu: Feather, accept: CheckCheck, reject: Undo2, retry: RotateCw },
  none: { shorten: null, expand: null, friendlier: null, formal: null, fix: null, custom: null, menu: null, accept: null, retry: null },
}

const copy: Record<string, Partial<RewriteLabels>> = {
  default: {},
  terse: { shorten: 'Shorter', expand: 'Longer', friendlier: 'Warmer', formal: 'Polite', fix: 'Fix', accept: 'Use', reject: 'Keep', retry: 'Retry', menu: 'Edit', empty: 'Nothing to rewrite yet.' },
  italiano: {
    shorten: 'Accorcia',
    expand: 'Espandi',
    friendlier: 'Più cordiale',
    formal: 'Formale',
    fix: 'Correggi',
    workingShorten: 'Taglio il superfluo',
    workingExpand: 'Aggiungo qualcosa',
    workingFriendlier: 'Scaldo il tono',
    workingFormal: 'Rifinisco il tono',
    workingFix: 'Controllo ortografia e grammatica',
    menu: 'Riscrivi',
    accept: 'Usa questo',
    reject: 'Tieni l’originale',
    retry: 'Riprova',
    before: 'Prima',
    after: 'Dopo',
    words: '{delta} parole',
    word: '{delta} parola',
    sameLength: 'Stessa lunghezza',
    empty: 'Scrivi una bozza, poi scegli come cambiarla.',
  },
}

const modeSets = { all: undefined, three: ['shorten', 'friendlier', 'formal'], 'fix only': ['fix'] } as const

/** A mode drawn through the `renderMode` slot: plain underlined words. */
function TextMode({ label, selected, disabled, onPress }: RewriteModeProps) {
  const t = useTheme()
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={{ paddingHorizontal: 8, height: 30, justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={[typeStyle(t, 'sm', { weight: selected ? 'semibold' : 'regular' }), { color: selected ? t.colors.text : t.colors.textSecondary, textDecorationLine: selected ? 'underline' : 'none' }]}>{label}</Text>
    </Pressable>
  )
}

export default definePlayground({
  name: 'rewrite',
  title: 'Rewrite',
  category: 'text',
  description: 'Shorten, expand, friendlier, formal or fix grammar. Toolbar, menu or chips; replace, diff or side-by-side results with accept and keep.',
  component: RewriteDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['toolbar', 'menu', 'chips'], 'toolbar', 'Presentation'),
    resultView: select(['replace', 'diff', 'sideBySide'], 'replace', 'Result view'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    modes: select(Object.keys(modeSets) as Array<keyof typeof modeSets>, 'all', 'Modes'),
    modeStyle: select(['default', 'text'], 'default', 'Modes (renderMode)'),
    showBadge: boolean(true, 'Badge'),
  },
  variantKeys: ['variant', 'presentation', 'resultView', 'size'],
  states: {
    idle: {},
    empty: { props: { value: '' }, description: 'Nothing to rewrite yet: the modes wait and the empty line shows.' },
    thinking: { script: mockScript.thinking(60_000), props: { initialMode: 'shorten' } },
    streaming: { script: mockScript.thinking(300).stream(sampleShorter, 45), props: { initialMode: 'shorten' }, freezeAt: 1400 },
    done: { script: mockScript.thinking(200).stream(sampleFixed, 500), props: { initialMode: 'fix' }, freezeAt: 3000 },
    formal: { script: mockScript.thinking(200).stream(sampleFormal, 500), props: { initialMode: 'formal' }, freezeAt: 3000 },
    error: { script: mockScript.error('context-overflow'), props: { initialMode: 'expand' } },
    refusal: { script: mockScript.refusal(), props: { initialMode: 'friendlier' } },
  },
  review: ['idle', 'streaming', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, modes, modeStyle, ...rest } = p as typeof p & Record<string, unknown>
    const set = modeSets[modes as keyof typeof modeSets]
    return (
      <RewriteDemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        modes={set ? [...set] : undefined}
        renderMode={modeStyle === 'text' ? (m) => <TextMode {...m} /> : undefined}
      />
    )
  },
})
