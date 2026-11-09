import { Text, View } from 'react-native'
import { CalendarCheck, CircleCheck, CircleSlash, CircleX, Hammer, Lock, PenLine, ShieldEllipsis, ShieldX, Unlock, X } from 'lucide-react-native'
import type { PendingConfirmation } from '@ondai/core'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ToolConfirmCard, type ToolActionsProps, type ToolConfirmCardIcons, type ToolConfirmCardLabels } from './tool-confirm-card'

const pending = (risk: PendingConfirmation['risk']): PendingConfirmation => ({
  id: 'p1',
  toolName: 'sendEmail',
  title: 'Send this email',
  description: 'Goes out from your account right away.',
  input: { to: 'priya@example.com', subject: 'Revised budget', body: 'Thanks Priya, approved. See you Friday.' },
  risk,
  confirm: () => {},
  cancel: () => {},
})

const event: PendingConfirmation = {
  id: 'p2',
  toolName: 'createEvent',
  title: 'Create the event',
  input: { title: 'Dinner with Marco', when: 'Sat, 8:00 PM', where: "Luigi's Trattoria", invite: 'marco@example.com' },
  risk: 'medium',
  confirm: () => {},
  cancel: () => {},
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<ToolConfirmCardIcons>> = {
  default: {},
  alternate: { tool: Hammer, riskLow: Unlock, riskMedium: ShieldEllipsis, riskHigh: ShieldX, edit: PenLine, confirm: CircleCheck, deny: X, done: CalendarCheck, error: CircleX, denied: CircleSlash },
  none: { tool: null, riskLow: null, riskMedium: null, riskHigh: null, edit: null, done: null, error: null, denied: null },
}

const copy: Record<string, Partial<ToolConfirmCardLabels>> = {
  default: {},
  terse: { wantsToRun: 'Run', riskLow: 'Safe', riskMedium: 'Check', riskHigh: 'Careful', edit: 'Change', editDone: 'Keep', deny: 'No', confirm: 'Yes', skipped: 'Skipped', denied: 'Declined' },
  italiano: { wantsToRun: 'Vuole eseguire', riskLow: 'Rischio basso', riskMedium: 'Serve il tuo ok', riskHigh: 'Rischio alto', edit: 'Modifica', editDone: 'Fatto', deny: 'Rifiuta', confirm: 'Conferma', failed: 'non riuscito', skipped: 'Saltato', denied: 'Hai detto di no' },
}

const fieldNames: Record<string, Record<string, string>> = {
  default: { to: 'To', subject: 'Subject', body: 'Message', when: 'When', where: 'Where', invite: 'Invite', title: 'Title' },
  terse: { to: 'To', subject: 'Re', body: 'Text', when: 'At', where: 'Place', invite: 'With', title: 'What' },
  italiano: { to: 'A', subject: 'Oggetto', body: 'Messaggio', when: 'Quando', where: 'Dove', invite: 'Invita', title: 'Titolo' },
}

/** `renderActions`: one wide key that says what happens, and a quiet way out. */
function OneKey({ approve, deny, risk }: ToolActionsProps) {
  return (
    <View style={{ gap: 6 }}>
      <Button title={risk === 'high' ? 'Approve, I checked it' : 'Go ahead'} icon={Lock} block onPress={approve} />
      <Button title="Not now" variant="ghost" size="sm" onPress={deny} style={{ alignSelf: 'center' }} />
    </View>
  )
}

/** `renderEmpty`: what an app might show while nothing waits. */
function Waiting() {
  const t = useTheme()
  return <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary, textAlign: 'center', paddingVertical: 24 }]}>Nothing is waiting for your OK</Text>
}

export default definePlayground({
  name: 'tool-confirm-card',
  title: 'ToolConfirmCard',
  category: 'agentic',
  description: 'Approval for any tool call: the call as a trace line, then a card with its parameters and deny or confirm.',
  component: ToolConfirmCard,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['card', 'sheet', 'banner', 'inline'], 'card', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    editable: boolean(true, 'Editable'),
    showTrace: boolean(true, 'Trace line'),
    customActions: boolean(false, 'One key (renderActions)'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    confirm: { props: { pending: event } },
    'high-risk': { props: { pending: pending('high') } },
    'low-risk': { props: { pending: { ...pending('low'), toolName: 'openScreen', title: 'Open Settings', description: 'Takes you to the Notifications page.', input: {} } } },
    editing: { props: { pending: event, defaultEditing: true }, description: 'Parameters open for a change before approving.' },
    running: { props: { pending: event, status: 'running', runningLabel: 'Adding dinner to your calendar' } },
    done: { props: { pending: event, status: 'done', result: 'Sat, 8:00 PM' } },
    error: { props: { pending: pending('high'), status: 'error', errorMessage: 'No connection' } },
    denied: { props: { pending: pending('high'), status: 'denied' } },
    empty: { props: { pending: null }, description: 'Nothing waiting: `renderEmpty` draws the placeholder.' },
  },
  review: ['confirm', 'high-risk', 'editing', 'done'],
  frame: { width: 400, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, customActions, presentation, ...rest } = p as typeof p & Record<string, unknown>
    const card = (
      <ToolConfirmCard
        {...(rest as object as { pending: PendingConfirmation | null })}
        presentation={presentation}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        fieldLabels={fieldNames[labels as string]}
        renderActions={customActions ? (a) => <OneKey {...a} /> : undefined}
        renderEmpty={() => <Waiting />}
      />
    )
    // The sheet overlays its parent, so give it a phone-ish stage to rise into.
    return presentation === 'sheet' ? <View style={{ height: 460, margin: -20, overflow: 'hidden' }}>{card}</View> : card
  },
})
