import { AudioLines, Bolt, File, PanelRight, TextSearch } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { BorderBeam } from '../border-beam/border-beam'
import { CommandBar, type CommandBarIcons, type CommandBarLabels } from './command-bar'
import { sampleActions } from './sample-data'

const createTask = (call: { callIndex: number }) =>
  call.callIndex === 0 ? mockScript.thinking(900).toolCall('task_create', { title: 'Buy milk', due: 'tomorrow' }) : mockScript.text('Done.')

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<CommandBarIcons>> = {
  default: {},
  alternate: { search: TextSearch, voice: AudioLines, action: Bolt, screen: PanelRight, item: File, open: TextSearch },
  none: { search: null, action: null, screen: null, item: null, thinking: null },
}

const copy: Record<string, Partial<CommandBarLabels>> = {
  default: {},
  terse: { placeholder: 'Type a command', thinking: 'Thinking', recent: 'Lately', groupActions: 'Do', groupScreens: 'Go to', groupItems: 'Open', run: 'Go', close: 'Hide', approve: 'Do it', cancel: 'No', openButton: 'Command' },
  italiano: {
    placeholder: 'Chiedi o fai qualcosa…',
    thinking: 'Sto capendo cosa intendi',
    retry: 'Riprova',
    cancel: 'Annulla',
    approve: 'Conferma',
    needsApproval: 'Serve il tuo ok prima di procedere',
    run: 'Esegui',
    close: 'Chiudi',
    recent: 'Recenti',
    suggestions: 'Suggerimenti',
    groupActions: 'Azioni',
    groupScreens: 'Schermate',
    groupItems: 'Elementi',
    empty: 'Nessun risultato. Premi invio e ci prova il modello.',
    openButton: 'Chiedi',
    closeButton: 'Chiudi',
  },
}

export default definePlayground({
  name: 'command-bar',
  title: 'CommandBar',
  category: 'agentic',
  description: 'Spotlight for your app: a natural-language request becomes one of your registered actions, chosen on device, with a preview and confirmation for risky actions.',
  component: CommandBar,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['spotlight', 'sheet', 'inline', 'pill', 'fullscreen'], 'spotlight', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    showVoice: boolean(true, 'Voice button'),
    showKeyHints: boolean(true, 'Key hints'),
    showBadge: boolean(true, 'Badge'),
    grouped: boolean(true, 'Grouped'),
    placeholder: text('Ask or do anything…', 'Placeholder'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    idle: { props: { initialQuery: '' } },
    focus: { props: { initialQuery: 'add' }, description: 'Suggestions filter as you type.' },
    thinking: { script: mockScript.thinking(60_000), props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true } },
    tool: { script: createTask, props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true }, freezeAt: 1500, description: 'The model picked an action; the preview row slides in.' },
    confirm: {
      script: (call) => (call.callIndex === 0 ? mockScript.thinking(700).toolCall('email_send', { to: 'priya@example.com', subject: 'Revised budget', body: 'Approved, thanks.' }) : mockScript.text('Sent.')),
      props: { initialQuery: 'email priya that the budget is approved', autoRun: true },
      freezeAt: 1200,
      description: 'Risky actions ask first.',
    },
    done: { script: createTask, props: { initialQuery: 'remind me to buy milk tomorrow', autoRun: true }, freezeAt: 4000 },
    empty: { props: { initialQuery: 'zzqx' }, description: 'Nothing matches; return hands it to the model.' },
    error: { script: mockScript.error('unknown'), props: { initialQuery: 'do the thing', autoRun: true } },
    refusal: { script: mockScript.refusal(), props: { initialQuery: 'something the model declines', autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { initialQuery: 'add expense 24.50 at luigi' }, description: 'No model: keyword search still works.' },
  },
  review: ['idle', 'thinking', 'tool', 'confirm'],
  frame: { width: 420, height: 560, padding: 0, background: 'bg', center: false },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, variant, ...rest } = p as typeof p & Record<string, unknown>
    // The beam is the clean look's working light; the other variants carry their own edge.
    const beam = variant === 'clean' || variant === 'minimal' || variant === 'glass'
    return (
      <CommandBar
        {...(rest as object)}
        variant={variant}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        // The placeholder control only speaks for itself while the copy set leaves it alone.
        placeholder={labels === 'default' || placeholder !== 'Ask or do anything…' ? placeholder : undefined}
        actions={sampleActions}
        inline
        open
        recent={['task.create', 'screen.inbox']}
        onVoice={async () => 'open settings'}
        frame={
          beam
            ? (panel, busy) => (
                <BorderBeam active={busy} radius="xl">
                  {panel}
                </BorderBeam>
              )
            : undefined
        }
      />
    )
  },
})
