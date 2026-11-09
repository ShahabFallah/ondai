import { Text, View } from 'react-native'
import { CircleCheckBig, CircleDashed, CircleSlash, CircleX, MessageSquareText, Repeat, Zap } from 'lucide-react-native'
import type { ToolStep } from '@ondai/core'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { AgentRun, type AgentRunIcons, type AgentRunLabels, type AgentStepProps } from './agent-run'
import { sampleAnswer, sampleGoal, sampleMeta, sampleTools } from './sample-data'

const steps = (stopAfter = 4) => (call: { callIndex: number }) => {
  const i = Math.min(call.callIndex, stopAfter)
  if (i === 0) return mockScript.thinking(900).toolCall('searchPlaces', { query: 'quiet dinner', near: 'Priya’s office' })
  if (i === 1) return mockScript.thinking(700).toolCall('checkCalendar', { day: 'Friday' })
  if (i === 2) return mockScript.thinking(800).toolCall('createEvent', { title: 'Dinner with Priya', when: 'Friday 19:30', where: 'Luigi’s Trattoria', invite: 'priya@example.com' })
  return mockScript.thinking(400).text(sampleAnswer)
}

/** The same agent with the event created without asking, so the run finishes on its own. */
const autoMeta = { ...sampleMeta, createEvent: { ...sampleMeta.createEvent!, title: 'Created the event and invited Priya', policy: 'auto' as const } }

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<AgentRunIcons>> = {
  default: {},
  alternate: { run: Zap, again: Repeat, stepDone: CircleCheckBig, stepRunning: CircleDashed, stepError: CircleX, stepCancelled: CircleSlash, answer: MessageSquareText },
  none: { run: null, again: null, stepDone: null, stepRunning: null, stepError: null, stepCancelled: null, answer: null },
}

const copy: Record<string, Partial<AgentRunLabels>> = {
  default: {},
  terse: { run: 'Go', cancel: 'Stop', runAgain: 'Again', idle: 'On device. Risky steps ask first.', planning: 'Thinking', nextStep: 'Next' },
  italiano: { run: 'Avvia', cancel: 'Annulla', runAgain: 'Rifai', idle: 'Gira su questo telefono. Prima di ogni passo rischioso chiede il tuo ok.', planning: 'Sto pianificando', nextStep: 'Decido il prossimo passo', refusal: 'Il modello sul dispositivo ha rifiutato.', stopped: 'Fermato' },
}

const fieldNames: Record<string, Record<string, string>> = {
  default: { when: 'When', where: 'Where', invite: 'Invite', title: 'Title' },
  terse: { when: 'At', where: 'Place', invite: 'With', title: 'What' },
  italiano: { when: 'Quando', where: 'Dove', invite: 'Invita', title: 'Titolo' },
}

/** The approval card inside the run speaks the same language. */
const confirmCopy: Record<string, object> = {
  italiano: { labels: { wantsToRun: 'Vuole eseguire', riskMedium: 'Serve il tuo ok', edit: 'Modifica', editDone: 'Fatto', deny: 'Rifiuta', confirm: 'Conferma' } },
  terse: { labels: { edit: 'Change', deny: 'No', confirm: 'Yes' } },
}

/** `renderStep`: a step as a log line, the way a developer console might show it. */
function LogStep({ step, time }: AgentStepProps) {
  const t = useTheme()
  return (
    <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textSecondary }]} numberOfLines={1}>
      {`${(step as ToolStep).status === 'done' ? '✓' : '·'} ${step.toolName}(${Object.values(step.input).slice(0, 1).join(', ')}) ${time}`}
    </Text>
  )
}

export default definePlayground({
  name: 'agent-run',
  title: 'AgentRun',
  category: 'agentic',
  description: 'An agent doing a job on the device, step by step: each tool call with its time, approval before anything risky, and the answer at the end.',
  component: AgentRun,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['card', 'plain'], 'card', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '28'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    showBadge: boolean(true, 'Badge'),
    showTimes: boolean(true, 'Step times'),
    logSteps: boolean(false, 'Log lines (renderStep)'),
    autoRun: boolean(true, 'Start on mount'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    idle: { props: { autoRun: false }, description: 'Before it starts: the goal and a Run key.' },
    planning: { script: mockScript.thinking(60_000), description: 'Before the first step.' },
    running: { script: steps(), freezeAt: 1300, description: 'A step runs; finished steps keep their time.' },
    confirm: { script: steps(), freezeAt: 3600, description: 'Waits for approval before creating the event.' },
    done: { script: steps(), props: { meta: autoMeta }, freezeAt: 6000, description: 'Every step done and the answer at the end.' },
    error: { script: (call) => (call.callIndex === 0 ? mockScript.thinking(600).toolCall('searchPlaces', { query: 'quiet dinner', near: 'Priya’s office' }) : mockScript.error('unknown', 'No connection')), freezeAt: 3000 },
    refusal: { script: mockScript.refusal() },
  },
  review: ['running', 'confirm', 'done'],
  frame: { width: 400, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, logSteps, meta, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <View>
        <AgentRun
          {...(rest as object)}
          goal={sampleGoal}
          tools={sampleTools}
          maxSteps={6}
          meta={(meta as typeof sampleMeta | undefined) ?? sampleMeta}
          tint={tints[tint as keyof typeof tints]}
          radius={radius === 'auto' ? undefined : Number(radius)}
          icons={iconSets[icons as string]}
          labels={copy[labels as string]}
          fieldLabels={fieldNames[labels as string]}
          confirmProps={confirmCopy[labels as string]}
          renderStep={logSteps ? (st) => <LogStep {...st} /> : undefined}
        />
      </View>
    )
  },
})
