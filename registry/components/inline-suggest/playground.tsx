import { Pressable, Text } from 'react-native'
import { CornerDownRight, Plus } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { InlineSuggest, type InlineSuggestIcons, type InlineSuggestLabels, type SuggestSlotProps } from './inline-suggest'

const typed = 'Hi Priya, can we move dinner to Saturday'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<InlineSuggestIcons>> = {
  default: {},
  alternate: { accept: CornerDownRight },
  plus: { accept: Plus },
  none: { accept: null },
}

const copy: Record<string, Partial<InlineSuggestLabels>> = {
  default: {},
  terse: { placeholder: 'Message', accept: 'Take', hintKeyboard: 'to take', hintTouch: 'Ready', thinking: 'Guessing' },
  italiano: { placeholder: 'Scrivi un messaggio', accept: 'Aggiungi', hintKeyboard: 'per completare', hintTouch: 'Suggerimento pronto', thinking: 'Penso a come continua', suggestion: 'Suggerimento' },
}

/** The suggestion itself as the key, through `renderAccept`. */
function PreviewKey({ suggestion, accept }: SuggestSlotProps) {
  const t = useTheme()
  if (!suggestion) return null
  return (
    <Pressable onPress={accept} accessibilityRole="button" style={({ pressed }) => ({ maxWidth: 180, height: 30, paddingHorizontal: 10, borderRadius: 9, justifyContent: 'center', backgroundColor: t.colors.muted, opacity: pressed ? 0.6 : 1 })}>
      <Text numberOfLines={1} style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>{`+ ${suggestion.trim()}`}</Text>
    </Pressable>
  )
}

export default definePlayground({
  name: 'inline-suggest',
  title: 'InlineSuggest',
  category: 'input',
  description: 'A text field that offers the rest of the sentence as ghost text while the person types, from the on-device model. Tab or the Add key takes it.',
  component: InlineSuggest,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '12', '18', '28'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    placeholder: text('Write a message', 'Placeholder'),
    showBadge: boolean(true, 'Badge'),
    previewKey: boolean(false, 'Preview key (renderAccept)'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    empty: {},
    suggesting: { script: mockScript.thinking(200).stream(' instead? Friday got busy at work.', 30), props: { defaultValue: typed }, freezeAt: 2000, description: 'The guess appears after the caret.' },
    thinking: { script: mockScript.thinking(60_000), props: { defaultValue: typed } },
  },
  review: ['empty', 'suggesting'],
  frame: { width: 390, padding: 16, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, previewKey, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <InlineSuggest
        {...(rest as object)}
        context="A message to Priya about Friday’s dinner"
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        // The placeholder control only speaks for itself while the copy set leaves it alone.
        placeholder={labels === 'default' || placeholder !== 'Write a message' ? (placeholder as string) : undefined}
        renderAccept={previewKey ? (k) => <PreviewKey {...k} /> : undefined}
      />
    )
  },
})
