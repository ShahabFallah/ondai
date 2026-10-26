import { View } from 'react-native'
import { useStreamText } from '@ondai/core'
import { useEffect } from 'react'
import type { FontSizeKey } from '@ondai/tokens'
import { StreamingText } from './streaming-text'

/** Streams the playground's mock script through the real hook. */
export function StreamingTextDemo({ size, mono, caret, autoRun = true }: { size?: FontSizeKey; mono?: boolean; caret?: boolean; autoRun?: boolean }) {
  const s = useStreamText({ component: 'streaming-text' })
  useEffect(() => {
    if (autoRun) void s.run('Summarize').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])
  return (
    <View style={{ gap: 8 }}>
      <StreamingText text={s.text} streaming={s.isBusy} size={size} mono={mono} caret={caret} placeholder="Waiting for the model…" />
    </View>
  )
}
