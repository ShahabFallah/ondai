import { useState } from 'react'
import { Text, View } from 'react-native'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { SmartReply, type SmartReplyProps } from './smart-reply'
import { sampleThread } from './sample-data'

export function SmartReplyDemo(props: Omit<SmartReplyProps, 'thread' | 'onSelect'>) {
  const t = useTheme()
  const [value, setValue] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        {sampleThread.map((m, i) => (
          <View key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: m.from === 'me' ? t.colors.text : t.colors.surface }}>
            <Text style={[typeStyle(t, 'sm'), { color: m.from === 'me' ? t.colors.bg : t.colors.text }]}>{m.text}</Text>
          </View>
        ))}
        {sent ? (
          <View style={{ alignSelf: 'flex-end', maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: t.colors.accent.solid }}>
            <Text style={[typeStyle(t, 'sm'), { color: t.colors.onAccent }]}>{sent}</Text>
          </View>
        ) : null}
      </View>
      <SmartReply {...props} thread={sampleThread} value={value} onChangeText={setValue} onSelect={(x) => (props.presentation === 'ghost' ? setValue(x) : setSent(x))} />
    </View>
  )
}
