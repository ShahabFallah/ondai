# VoiceInput

Push-to-talk that transcribes on device: the mic is the variant's key, a waveform drawn in the variant, then the transcript with Use and Retry.

```bash
npx ondai add voice-input
```

```tsx
import { VoiceInput, type Recorder } from '@/components/ondai/voice-input'

// Audio capture is yours to provide (expo-audio, react-native-audio-record, your own module).
const recorder: Recorder = {
  start: () => audio.start(),
  stop: () => audio.stop(), // resolves WAV/PCM bytes
  onLevel: (cb) => audio.subscribeLevel(cb),
}

<VoiceInput recorder={recorder} presentation="pill" visual="bars" onTranscript={(text) => setQuery(text)} />
```

Docs: https://ondai.dev/docs/components/voice-input
