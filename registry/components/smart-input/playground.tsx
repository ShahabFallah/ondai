import { Text, View } from 'react-native'
import { AudioLines, CircleDot, CornerDownLeft, ScanText, TextCursorInput, ThumbsUp, Undo2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { SmartInput, type SmartInputIcons, type SmartInputLabels } from './smart-input'
import { expenseAliases, expenseSchema, sampleParsed, sampleUtterance } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<SmartInputIcons>> = {
  default: {},
  alternate: { input: TextCursorInput, voice: AudioLines, camera: ScanText, submit: CornerDownLeft, filled: CircleDot, confirm: ThumbsUp, undo: Undo2 },
  none: { input: null, filled: null, submit: null, undo: null },
}

const copy: Record<string, { labels: Partial<SmartInputLabels>; fields?: Record<string, string> }> = {
  default: { labels: {} },
  terse: { labels: { placeholder: 'Say it', thinking: 'Filling', fill: 'Go', use: 'Save', confirm: 'OK', undo: 'Back', filledCount: '{count}/{total}' }, fields: { merchant: 'Shop', amount: 'Total', category: 'Type' } },
  italiano: {
    labels: { placeholder: 'Descrivi la spesa…', thinking: 'Compilo i dettagli', fill: 'Compila', use: 'Usa questi', confirm: 'Va bene', undo: 'Annulla', undoAll: 'Annulla tutto', filledCount: 'Compilati {count} di {total}', add: 'Aggiungi', retry: 'Riprova' },
    fields: { merchant: 'Esercente', amount: 'Importo', currency: 'Valuta', category: 'Categoria', date: 'Data', note: 'Nota' },
  },
}

/** A tip under the field before anything is filled, through `renderEmpty`. */
function Tip() {
  const t = useTheme()
  return (
    <View style={{ paddingHorizontal: 4, gap: 2 }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>Try</Text>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>“Taxi to the airport, 38 euros, this morning”</Text>
    </View>
  )
}

export default definePlayground({
  name: 'smart-input',
  title: 'SmartInput',
  category: 'input',
  description: 'Text, voice or photo fills your zod form on device, with per-field confidence and confirm or undo.',
  component: SmartInput,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['field', 'composer', 'overlay', 'card'], 'field', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    confidenceStyle: select(['highlight', 'badge', 'underline'], 'highlight', 'Confidence'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    voice: boolean(true, 'Voice'),
    camera: boolean(true, 'Camera'),
    showBadge: boolean(true, 'Badge'),
    useKey: boolean(true, 'Use key (onUse)'),
    tip: boolean(false, 'Tip (renderEmpty)'),
    placeholder: text('Describe the expense…', 'Placeholder'),
  },
  variantKeys: ['variant', 'presentation', 'size', 'confidenceStyle'],
  states: {
    idle: {},
    thinking: { script: mockScript.thinking(60_000), props: { initialText: sampleUtterance, autoRun: true } },
    filled: { script: mockScript.thinking(700).object(sampleParsed), props: { initialText: sampleUtterance, autoRun: true }, freezeAt: 1500, description: 'Enum fuzzy-matched (Food & drinks → food), date parsed from "yesterday".' },
    'low-confidence': { script: mockScript.thinking(500).object({ merchant: 'Lui', amount: 'twenty-ish', category: 'stuff', date: 'around then' }), props: { initialText: 'spent some money at lui', autoRun: true }, freezeAt: 1200 },
    error: { script: mockScript.error('invalid-output'), props: { initialText: sampleUtterance, autoRun: true } },
    refusal: { script: mockScript.refusal(), props: { initialText: sampleUtterance, autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
  },
  review: ['idle', 'thinking', 'filled'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, useKey, tip, ...rest } = p as typeof p & Record<string, unknown>
    const set = copy[labels as string] ?? copy.default!
    return (
      <SmartInput
        {...(rest as object)}
        schema={expenseSchema}
        aliases={expenseAliases}
        instructions="Expenses app."
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={set.labels}
        fieldLabels={set.fields}
        // The placeholder control only speaks for itself while the copy set leaves it alone.
        placeholder={labels === 'default' || placeholder !== 'Describe the expense…' ? (placeholder as string) : undefined}
        renderEmpty={tip ? () => <Tip /> : undefined}
        onUse={useKey ? () => {} : undefined}
        onVoice={async () => sampleUtterance}
        onCamera={async () => 'LUIGI TRATTORIA  TOTAL 24.50 EUR  CARD'}
      />
    )
  },
})
