import { mockScript } from '@ondai/core/mock'
import { definePlayground, select } from '@ondai/playground'
import { ScanToData } from './scan-to-data'
import { cardAnswer, cardOcr, receiptAnswer, receiptImage, receiptOcr } from './sample-data'

export default definePlayground({
  name: 'scan-to-data',
  title: 'ScanToData',
  category: 'vision',
  description: 'Camera or photo becomes structured data: a scanning frame with an ion edge sweep, a picker, or a result card. Receipts, business cards, events or your own schema.',
  component: ScanToData,
  controls: {
    presentation: select(['camera', 'picker', 'card'], 'camera', 'Presentation'),
    preset: select(['receipt', 'businessCard', 'event'], 'receipt', 'Preset'),
  },
  variantKeys: ['presentation', 'preset'],
  states: {
    idle: {},
    scanning: { script: mockScript.thinking(60_000), props: { initialImage: receiptImage, initialText: receiptOcr, autoRun: true }, description: 'The photo resolves out of an ASCII field while OCR and extraction run.' },
    done: { script: mockScript.thinking(900).object(receiptAnswer), props: { initialImage: receiptImage, initialText: receiptOcr, autoRun: true }, freezeAt: 1800, description: '"restaurant" → food, "VISA" → card, "25/10/2026" → ISO date.' },
    'business-card': { script: mockScript.thinking(900).object(cardAnswer), props: { preset: 'businessCard', initialText: cardOcr, autoRun: true }, freezeAt: 1800 },
    error: { script: mockScript.error('invalid-output'), props: { initialText: receiptOcr, autoRun: true } },
    'no-ocr': { props: { ocr: undefined }, description: 'Without an OCR provider the frame explains itself.' },
  },
  review: ['idle', 'scanning', 'done'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p) => <ScanToData {...(p as object)} ocr={p.ocr === undefined && 'ocr' in p ? undefined : async () => (p.preset === 'businessCard' ? cardOcr : receiptOcr)} />,
})
