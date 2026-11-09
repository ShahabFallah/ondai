import { useState } from 'react'
import { View } from 'react-native'
import { SkinProvider } from '@ondai/tokens/react'
import { Field } from '../field/field'
import { AutoTag, type AutoTagProps } from './auto-tag'
import { noteTags, sampleNote } from './sample-data'

export function AutoTagDemo({ initialSelected = [], ...props }: Omit<AutoTagProps, 'text' | 'selected' | 'onChange' | 'tags'> & { initialSelected?: string[] }) {
  const [text, setText] = useState(sampleNote)
  const [selected, setSelected] = useState<string[]>(initialSelected)
  return (
    // The note field follows the same variant, so the screen reads as one piece.
    <SkinProvider skin={props.variant} tint={props.tint}>
      <View style={{ gap: 12 }}>
        <Field label="Note" value={text} onChangeText={setText} multiline numberOfLines={3} scrollEnabled={false} />
        <AutoTag {...props} tags={noteTags} text={text} selected={selected} onChange={setSelected} />
      </View>
    </SkinProvider>
  )
}
