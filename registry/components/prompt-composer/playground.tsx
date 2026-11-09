import { Pressable, Text, View } from 'react-native'
import { ArrowRight, ArrowUp, Camera, CirclePause, File, Paperclip, Send, Square } from 'lucide-react-native'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { LiquidMetal } from '../liquid-metal/liquid-metal'
import { PromptComposer, type ComposerSendProps, type PromptComposerIcons, type PromptComposerLabels } from './prompt-composer'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<PromptComposerIcons>> = {
  default: {},
  alternate: { attach: Paperclip, send: Send, stop: CirclePause, image: Camera, file: File },
  arrow: { send: ArrowRight, attach: null },
}

const copy: Record<string, Partial<PromptComposerLabels>> = {
  default: {},
  terse: { placeholder: 'Message', send: 'Go', stop: 'Halt', attach: 'Attach', remove: 'Drop' },
  italiano: { placeholder: 'Chiedi qualcosa', send: 'Invia', stop: 'Ferma', attach: 'Aggiungi foto o file', remove: 'Rimuovi' },
}

/**
 * The live liquid-metal shader as the send key, through the `renderSend` slot. The kit's own `metal`
 * variant is drawn with react-native-svg; apps that want the shader add the `liquid-metal` fx component.
 */
function LiveMetalSend({ canSend, busy, submit, stop }: ComposerSendProps) {
  const t = useTheme()
  const Icon = busy ? Square : ArrowUp
  return (
    <LiquidMetal radius={12} ringWidth={2.5} preset="silver" active={busy}>
      <Pressable onPress={busy ? stop : submit} disabled={!busy && !canSend} accessibilityRole="button" accessibilityLabel={busy ? 'Stop' : 'Send'} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', opacity: !busy && !canSend ? 0.45 : 1 }}>
        <Icon size={busy ? 12 : 16} strokeWidth={busy ? 2.5 : 2} color={t.colors.text} fill={busy ? t.colors.text : 'none'} />
      </Pressable>
    </LiquidMetal>
  )
}

/** A small accessory, to show the toolbar slot. */
function ModelPicker() {
  const t = useTheme()
  return (
    <View style={{ height: 26, paddingHorizontal: 8, borderRadius: 8, justifyContent: 'center', backgroundColor: t.colors.muted }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Fast</Text>
    </View>
  )
}

export default definePlayground({
  name: 'prompt-composer',
  title: 'PromptComposer',
  category: 'chat',
  description: 'Where a person writes to the on-device model: a growing field, attachments, the model badge and a send key that becomes stop while it answers.',
  component: PromptComposer,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '12', '18', '28'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    placeholder: text('Ask anything', 'Placeholder'),
    showBadge: boolean(true, 'Badge'),
    accessory: boolean(false, 'Accessory'),
    liveMetal: boolean(false, 'Live metal key (renderSend)'),
    disabled: boolean(false, 'Disabled'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    empty: {},
    typed: { props: { value: 'Plan a slow Saturday in Lyon, nothing before 10' } },
    attachments: {
      props: {
        value: 'What is the total on this receipt?',
        attachments: [
          { id: 'a', name: 'Receipt.jpg', kind: 'image' },
          { id: 'b', name: 'Budget.pdf', kind: 'file' },
        ],
      },
    },
    busy: { props: { busy: true, value: '' }, description: 'While the model answers, the key stops it.' },
  },
  review: ['empty', 'attachments', 'busy'],
  frame: { width: 390, padding: 16, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, accessory, liveMetal, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <PromptComposer
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        placeholder={labels === 'default' || placeholder !== 'Ask anything' ? (placeholder as string) : undefined}
        accessory={accessory ? <ModelPicker /> : undefined}
        renderSend={liveMetal ? (k) => <LiveMetalSend {...k} /> : undefined}
        onSubmit={() => {}}
        onStop={() => {}}
        onAttach={() => {}}
        onRemoveAttachment={() => {}}
      />
    )
  },
})
