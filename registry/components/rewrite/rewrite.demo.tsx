import { useState } from 'react'
import { View } from 'react-native'
import { SkinProvider } from '@ondai/tokens/react'
import { Field } from '../field/field'
import { Rewrite, type RewriteProps } from './rewrite'
import { sampleDraft } from './sample-data'

/** A message field with Rewrite under it. The field follows the same variant, as it would in an app that sets one. */
export function RewriteDemo(props: Omit<RewriteProps, 'value' | 'onAccept'> & { value?: string }) {
  const [text, setText] = useState(props.value ?? sampleDraft)
  return (
    <SkinProvider skin={props.variant} tint={props.tint}>
      <View style={{ gap: 12 }}>
        <Field label="Message" value={text} onChangeText={setText} multiline numberOfLines={4} scrollEnabled={false} />
        <Rewrite {...props} value={text} onAccept={setText} />
      </View>
    </SkinProvider>
  )
}
