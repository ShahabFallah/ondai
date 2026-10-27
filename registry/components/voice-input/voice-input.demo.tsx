import { useEffect, useMemo } from 'react'
import { simulatedRecorder, useVoiceInput } from './use-voice-input'
import { VoiceInput, type VoiceInputProps } from './voice-input'

export type VoiceDemoStage = 'idle' | 'listening' | 'thinking' | 'done'

/** Drives `useVoiceInput` through the playground's stage on the simulated recorder, then hands it to the component. */
export function VoiceInputDemo({ stage = 'idle', ...props }: Omit<VoiceInputProps, 'controller' | 'recorder'> & { stage?: VoiceDemoStage }) {
  const recorder = useMemo(() => simulatedRecorder({ seed: 7, stopDelayMs: stage === 'thinking' ? Infinity : 0 }), [stage])
  const voice = useVoiceInput({ recorder, onTranscript: props.onTranscript, language: props.language, localOnly: props.localOnly })
  useEffect(() => {
    if (stage === 'idle') return
    let alive = true
    void voice
      .start()
      .then(() => (alive && stage !== 'listening' ? voice.stop() : undefined))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  return <VoiceInput {...props} controller={voice} />
}
