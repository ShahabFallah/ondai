import { useState } from 'react'
import { View } from 'react-native'
import { Field } from '../field/field'
import { AutoTag, type AutoTagProps } from './auto-tag'
import { noteTags, sampleNote } from './sample-data'

export function AutoTagDemo(props: Omit<AutoTagProps, 'text' | 'selected' | 'onChange' | 'tags'>) {
  const [text, setText] = useState(sampleNote)
  const [selected, setSelected] = useState<string[]>([])
  return (
    <View style={{ gap: 12 }}>
      <Field label="Note" value={text} onChangeText={setText} multiline />
      <AutoTag {...props} tags={noteTags} text={text} selected={selected} onChange={setSelected} />
    </View>
  )
}
