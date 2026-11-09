import { Text, View } from 'react-native'
import { Aperture, CircleCheck, FileScan, Images, ScanSearch, Undo2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { ScanToData, type ScanRowProps, type ScanToDataIcons, type ScanToDataLabels } from './scan-to-data'
import { cardAnswer, cardOcr, receiptAnswer, receiptImage, receiptOcr } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<ScanToDataIcons>> = {
  default: {},
  alternate: { scan: FileScan, camera: Aperture, library: Images, reading: ScanSearch, done: CircleCheck, retake: Undo2 },
  none: { scan: null, camera: null, library: null, done: null, retake: null, reading: null, finding: null },
}

const copy: Record<string, { labels: Partial<ScanToDataLabels>; fields?: Record<string, string> }> = {
  default: { labels: {} },
  terse: { labels: { scan: 'Scan', scanHint: 'Stays on device.', takePhoto: 'Camera', choosePhoto: 'Photos', found: '{count} found', fromYour: '', use: 'Save', scanAgain: 'Redo', check: '?' }, fields: { total: 'Sum', paymentMethod: 'Paid by' } },
  italiano: {
    labels: {
      subject: 'scontrino',
      scan: 'Scansiona uno {subject}',
      scanHint: 'Letto su questo dispositivo. La foto non esce da qui.',
      takePhoto: 'Scatta',
      choosePhoto: 'Scegli foto',
      reading: 'Leggo lo {subject}',
      read: 'Ho letto lo {subject}',
      finding: 'Cerco {field}',
      findingMany: 'Cerco {fields}',
      andMore: 'e altro',
      found: 'Trovati {count} dettagli',
      fromYour: 'dal tuo {subject}',
      check: 'da controllare',
      scanAgain: 'Rifai',
      use: 'Usa questi',
      retake: 'Rifai',
      error: 'Non riesco a leggere lo {subject}',
    },
    fields: { merchant: 'Esercente', total: 'Totale', currency: 'Valuta', date: 'Data', category: 'Categoria', paymentMethod: 'Pagamento' },
  },
}

/** A value row drawn by the app, through `renderRow`. */
function StackedRow({ label, value, confidence }: ScanRowProps) {
  const t = useTheme()
  return (
    <View style={{ paddingVertical: 6, gap: 1 }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{label}</Text>
      <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: confidence < 0.7 ? t.colors.warning : t.colors.text }]}>{value}</Text>
    </View>
  )
}

export default definePlayground({
  name: 'scan-to-data',
  title: 'ScanToData',
  category: 'vision',
  description: 'Camera or photo becomes structured data: a viewfinder, a soft scan line while it reads, then a card of fields. Receipts, business cards, events or your own schema.',
  component: ScanToData,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['camera', 'picker', 'card'], 'camera', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    preset: select(['receipt', 'businessCard', 'event'], 'receipt', 'Preset'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    showBadge: boolean(true, 'Badge'),
    stacked: boolean(false, 'Stacked rows (renderRow)'),
  },
  variantKeys: ['variant', 'presentation', 'size', 'preset'],
  states: {
    idle: {},
    scanning: { script: mockScript.thinking(60_000), props: { initialImage: receiptImage, initialText: receiptOcr, autoRun: true }, description: 'A soft band of light moves down the photo while the fields resolve one by one.' },
    done: { script: mockScript.thinking(900).object(receiptAnswer), props: { initialImage: receiptImage, initialText: receiptOcr, autoRun: true }, freezeAt: 1800, description: '"restaurant" → food, "VISA" → card, "25/10/2026" → ISO date.' },
    'business-card': { script: mockScript.thinking(900).object(cardAnswer), props: { preset: 'businessCard', initialText: cardOcr, autoRun: true }, freezeAt: 1800 },
    error: { script: mockScript.error('invalid-output'), props: { initialText: receiptOcr, autoRun: true } },
    'no-ocr': { props: { ocr: undefined }, description: 'Without an OCR provider the viewfinder says so.' },
  },
  review: ['idle', 'scanning', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, stacked, ...rest } = p as typeof p & Record<string, unknown>
    const set = copy[labels as string] ?? copy.default!
    const ocr = p.ocr === undefined && 'ocr' in p ? undefined : async () => (p.preset === 'businessCard' ? cardOcr : receiptOcr)
    return (
      <ScanToData
        {...(rest as object)}
        ocr={ocr}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={set.labels}
        fieldLabels={set.fields}
        renderRow={stacked ? (r) => <StackedRow {...r} /> : undefined}
        onUse={() => {}}
      />
    )
  },
})
