import { useState } from 'react'
import { View } from 'react-native'
import { Field } from '../field/field'
import { Rewrite, type RewriteProps } from './rewrite'
import { sampleDraft } from './sample-data'

export function RewriteDemo(props: Omit<RewriteProps, 'value' | 'onAccept'> & { value?: string }) {
  const [text, setText] = useState(props.value ?? sampleDraft)
  return (
    <View style={{ gap: 12 }}>
      <Field label="Message" value={text} onChangeText={setText} multiline />
      <Rewrite {...props} value={text} onAccept={setText} />
    </View>
  )
}
