import { useState } from 'react'
import { View } from 'react-native'
import { SkinProvider } from '@ondai/tokens/react'
import { Field } from '../field/field'
import { ToneCheck, type ToneCheckProps } from './tone-check'
import { sampleBlunt } from './sample-data'

/** A message field with ToneCheck under it. Taking the softer version puts it in the field. */
export function ToneCheckDemo(props: Omit<ToneCheckProps, 'value' | 'onAccept'> & { value?: string }) {
  const [text, setText] = useState(props.value ?? sampleBlunt)
  return (
    <SkinProvider skin={props.variant} tint={props.tint}>
      <View style={{ gap: 12 }}>
        <Field label="Message" value={text} onChangeText={setText} multiline numberOfLines={3} scrollEnabled={false} />
        <ToneCheck {...props} value={text} onAccept={setText} />
      </View>
    </SkinProvider>
  )
}
