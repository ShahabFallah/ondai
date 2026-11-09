import { useState } from 'react'
import { Text, View } from 'react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { SmartReply, type SmartReplyProps } from './smart-reply'
import { sampleThread } from './sample-data'

/** A short thread with SmartReply under it; picking a reply sends it (or fills the field in `ghost`). */
export function SmartReplyDemo(props: Omit<SmartReplyProps, 'thread' | 'onSelect'>) {
  const t = useTheme()
  const [value, setValue] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const bubble = (mine: boolean) => ({ alignSelf: mine ? ('flex-end' as const) : ('flex-start' as const), maxWidth: '82%' as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: mine ? t.colors.text : t.colors.muted })
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        {sampleThread.map((m, i) => (
          <View key={i} style={bubble(m.from === 'me')}>
            <Text style={[typeStyle(t, 'md'), { color: m.from === 'me' ? t.colors.bg : t.colors.text }]}>{m.text}</Text>
          </View>
        ))}
        {sent ? (
          <View style={bubble(true)}>
            <Text style={[typeStyle(t, 'md'), { color: t.colors.bg }]}>{sent}</Text>
          </View>
        ) : null}
      </View>
      <SmartReply {...props} thread={sampleThread} value={value} onChangeText={setValue} onSelect={(x) => (props.presentation === 'ghost' ? setValue(x) : setSent(x))} />
    </View>
  )
}
