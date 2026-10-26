# ScanToData

Camera or photo becomes structured data (receipt, business card, event, or your own schema) via on-device OCR and the local model.

```bash
npx ondai add scan-to-data
```

```tsx
import { ScanToData } from '@/components/ondai/scan-to-data'
import TextRecognition from '@react-native-ml-kit/text-recognition'

<ScanToData
  preset="receipt"
  ocr={async (img) => (await TextRecognition.recognize(img.uri)).text}
  onData={(receipt) => expenses.add(receipt)}
/>
```

Docs: https://ondai.dev/docs/components/scan-to-data
