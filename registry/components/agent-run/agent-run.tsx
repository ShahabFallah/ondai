import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Ban, Check, Circle, CircleAlert, Flag, Play, RotateCcw } from 'lucide-react-native'
import { humanize, useToolAgent, type PendingConfirmation, type ToolSet, type ToolStep, type UseToolAgentOptions } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinTile, skinHasWells, Surface } from '../surface/surface'
import { ToolConfirmCard, type ToolConfirmCardProps } from '../tool-confirm-card/tool-confirm-card'

/** Every icon AgentRun draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface AgentRunIcons {
  /** On the Run key. */
  run: IconInput
  /** On the Run again key. */
  again: IconInput
  /** Step marks, by status. */
  stepDone: IconInput
  stepRunning: IconInput
  stepError: IconInput
  stepCancelled: IconInput
  /** Beside the answer at the end. */
  answer: IconInput
}

/** Every string AgentRun shows or announces. */
export interface AgentRunLabels {
  run: string
  cancel: string
  runAgain: string
  /** Under the goal before it starts. */
  idle: string
  /** While the model plans the first step, and between steps. */
  planning: string
  nextStep: string
  /** When the model declines the task. */
  refusal: string
  /** Before the error when a run stops: "Stopped: No connection". */
  stopped: string
}

/** Styles for each part, applied after the component's own. */
export interface AgentRunStyles {
  /** The outer view (the panel in the `card` presentation). */
  container: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  goal: StyleProp<TextStyle>
  steps: StyleProp<ViewStyle>
  step: StyleProp<ViewStyle>
  stepLabel: StyleProp<TextStyle>
  answer: StyleProp<ViewStyle>
  answerText: StyleProp<TextStyle>
  actions: StyleProp<ViewStyle>
}

export const agentRunLabels: AgentRunLabels = {
  run: 'Run',
  cancel: 'Cancel',
  runAgain: 'Run again',
  idle: 'Runs on this phone. Anything risky waits for your OK.',
  planning: 'Planning',
  nextStep: 'Deciding the next step',
  refusal: 'The on-device model declined this task.',
  stopped: 'Stopped',
}

export interface AgentStepProps {
  step: ToolStep
  /** The step as a sentence (`describe`, the tool's title, or its name in words). */
  label: string
  /** Seconds it took, "0.9s", or empty while it runs. */
  time: string
  /** The status mark as AgentRun would draw it (respects `icons`). */
  icon: ReactNode
}

export interface AgentActionsProps {
  started: boolean
  busy: boolean
  done: boolean
  start: () => void
  stop: () => void
}

export interface AgentRunProps<T extends ToolSet> extends UseToolAgentOptions<T> {
  /** What the person asked for, in their words. */
  goal: string
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the panel,
   * the step marks, the approval card and the keys together.
   */
  variant?: SkinInput
  /** `card` draws the run on a panel; `plain` sits on the page. */
  presentation?: 'card' | 'plain'
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, step tiles and glow. Defaults to the theme accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  /** Start on mount. Otherwise a Run key starts it. */
  autoRun?: boolean
  /** A sentence for a step: "Checked the weather in Lyon". Defaults to the tool's title. */
  describe?: (step: ToolStep) => string
  /** Names for parameter keys on the approval card: `{ when: 'When' }`. */
  fieldLabels?: Record<string, string>
  icons?: Partial<AgentRunIcons>
  labels?: Partial<AgentRunLabels>
  styles?: Partial<AgentRunStyles>
  /** Extra props for the approval card (its labels, icons, `editable`). */
  confirmProps?: Partial<Omit<ToolConfirmCardProps, 'pending'>>
  /** The "On device · Apple" badge beside the goal. */
  showBadge?: boolean
  /** Seconds beside each finished step. */
  showTimes?: boolean
  /** Draw one step yourself. */
  renderStep?: (step: AgentStepProps) => ReactNode
  /** Draw the approval yourself. Call `pending.confirm()` or `pending.cancel()`. */
  renderConfirm?: (pending: PendingConfirmation) => ReactNode
  /** Draw the answer at the end yourself. */
  renderAnswer?: (text: string) => ReactNode
  /** Shown before the run starts, under the goal. Receives `start`. */
  renderIdle?: (start: () => void) => ReactNode
  /** Draw the keys at the bottom yourself (Run, Cancel, Run again). */
  renderActions?: (state: AgentActionsProps) => ReactNode
  onDone?: (text: string) => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<AgentRunProps<ToolSet>['size']>
const sizes: Record<Size, { goal: FontSizeKey; step: FontSizeKey; meta: FontSizeKey; answer: FontSizeKey; pad: number; gap: number; mark: number; icon: number; key: 'sm' | 'md' | 'lg' }> = {
  sm: { goal: 'md', step: 'xs', meta: 'xs', answer: 'sm', pad: 14, gap: 8, mark: 20, icon: 12, key: 'sm' },
  md: { goal: 'lg', step: 'sm', meta: 'xs', answer: 'md', pad: 16, gap: 10, mark: 24, icon: 14, key: 'sm' },
  lg: { goal: 'xl', step: 'md', meta: 'sm', answer: 'lg', pad: 20, gap: 12, mark: 28, icon: 16, key: 'md' },
}

const secs = (s: ToolStep) => (s.endedAt && s.endedAt - s.startedAt >= 100 ? `${((s.endedAt - s.startedAt) / 1000).toFixed(1)}s` : '')
/** The live step's mark: a small filled dot. */
const Dot = ({ color, size = 14 }: IconProps) => <Circle size={Math.round(size * 0.6)} strokeWidth={0} fill={color} color={color} />
const keyIcon = (override: IconInput | undefined, fallback?: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/**
 * An agent doing a job on the device, shown as it happens: each tool call as a line with its time,
 * a card that waits for approval before anything risky runs, and the answer at the end.
 * Cancel stops it at any point; nothing runs that the person did not see.
 */
export function AgentRun<T extends ToolSet>({ variant, tint, ...props }: AgentRunProps<T>) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <RunInner {...(props as AgentRunProps<ToolSet>)} />
    </SkinProvider>
  )
}

function RunInner({
  goal,
  presentation = 'card',
  size = 'md',
  radius,
  autoRun = true,
  describe,
  fieldLabels,
  icons = {},
  labels: labelsProp,
  styles = {},
  confirmProps,
  showBadge = true,
  showTimes = true,
  renderStep,
  renderConfirm,
  renderAnswer,
  renderIdle,
  renderActions,
  onDone,
  style,
  testID,
  ...options
}: Omit<AgentRunProps<ToolSet>, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels = { ...agentRunLabels, ...labelsProp }
  const agent = useToolAgent({ component: 'agent-run', ...options })
  const [started, setStarted] = useState(false)
  const busy = agent.status === 'thinking' || agent.status === 'tool' || agent.status === 'confirm' || agent.status === 'streaming'
  const done = agent.status === 'done'
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const wells = skinHasWells(s.skin)

  const start = () => {
    setStarted(true)
    void agent
      .run(goal)
      .then((r) => onDone?.(r.text))
      .catch(() => {})
  }
  const stop = () => agent.stop()
  const ran = useRef(false)
  useEffect(() => {
    if (autoRun && !ran.current) {
      ran.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  const label = (st: ToolStep) => describe?.(st) ?? options.meta?.[st.toolName]?.title ?? humanize(st.toolName)
  const ink = (fallback: string) => (wells ? s.tile.ink : fallback)
  const markIcon = (st: ToolStep) => {
    const p = { size: z.icon, strokeWidth: 1.9 }
    if (st.status === 'done') return renderIcon(icons.stepDone, Check, { ...p, strokeWidth: 2.2, color: ink(t.colors.text) })
    if (st.status === 'error') return renderIcon(icons.stepError, CircleAlert, { ...p, color: ink(t.colors.danger) })
    if (st.status === 'cancelled') return renderIcon(icons.stepCancelled, Ban, { ...p, color: ink(t.colors.textTertiary) })
    return renderIcon(icons.stepRunning, Dot, { ...p, color: ink(t.colors.textSecondary) })
  }
  const visibleSteps = agent.steps.filter((st) => st.status !== 'awaiting-confirmation' || !agent.pendingConfirmation)
  const thinking = started && agent.status === 'thinking' && !agent.pendingConfirmation

  const header = (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, styles.header]}>
      <Text style={[typeStyle(t, z.goal, { weight: 'semibold' }), { color: t.colors.text, flex: 1 }, styles.goal]}>{goal}</Text>
      {showBadge ? <OnDeviceBadge size="sm" state={agent.status} provider={agent.provider} locality={agent.locality} style={{ marginTop: 1 }} /> : null}
    </View>
  )

  const stepRow = (st: ToolStep) => {
    const props: AgentStepProps = { step: st, label: label(st), time: secs(st), icon: markIcon(st) }
    if (renderStep) return <View key={st.id}>{renderStep(props)}</View>
    const live = st.status === 'running' || st.status === 'pending' || st.status === 'awaiting-confirmation'
    return (
      <Animated.View key={st.id} entering={fade} style={[{ flexDirection: 'row', alignItems: 'center', gap: z.gap, minHeight: z.mark }, styles.step]}>
        <Mark size={z.mark} live={live}>
          {props.icon}
        </Mark>
        {live ? (
          <ShimmerText size={z.step} active style={{ flex: 1 }}>
            {props.label}
          </ShimmerText>
        ) : (
          <Text numberOfLines={2} style={[typeStyle(t, z.step), { color: st.status === 'cancelled' ? t.colors.textTertiary : t.colors.textSecondary, flex: 1 }, styles.stepLabel]}>
            {st.status === 'error' && st.error ? `${props.label}: ${st.error}` : props.label}
          </Text>
        )}
        {showTimes && props.time ? <Text style={[typeStyle(t, z.meta), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{props.time}</Text> : null}
      </Animated.View>
    )
  }

  const steps =
    visibleSteps.length || thinking ? (
      <View style={[{ gap: z.gap - 2 }, styles.steps]}>
        {visibleSteps.map(stepRow)}
        {thinking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z.gap, minHeight: z.mark }}>
            <Mark size={z.mark} live>
              {renderIcon(icons.stepRunning, Dot, { size: z.icon, color: ink(t.colors.textTertiary) })}
            </Mark>
            <ShimmerText size={z.step} active>
              {agent.steps.length ? labels.nextStep : labels.planning}
            </ShimmerText>
          </View>
        ) : null}
      </View>
    ) : null

  const confirm = agent.pendingConfirmation
    ? (renderConfirm?.(agent.pendingConfirmation) ?? <ToolConfirmCard pending={agent.pendingConfirmation} presentation="inline" size={size} fieldLabels={fieldLabels} editable {...confirmProps} />)
    : null

  const answer =
    done && agent.text ? (
      <Animated.View entering={fade}>
        {renderAnswer ? (
          renderAnswer(agent.text)
        ) : (
          <Surface elevation="inset" radius={Math.max(8, s.radius.inset)} style={[{ flexDirection: 'row', gap: z.gap, padding: z.pad - 4, alignItems: 'flex-start' }, styles.answer]}>
            {icons.answer === null ? null : (
              <Mark size={z.mark} answer>
                {renderIcon(icons.answer, Flag, { size: z.icon, strokeWidth: 1.9, color: ink(t.colors.text) })}
              </Mark>
            )}
            <Text style={[typeStyle(t, z.answer), { color: t.colors.text, flex: 1, marginTop: 1 }, styles.answerText]}>{agent.text}</Text>
          </Surface>
        )}
      </Animated.View>
    ) : null

  const failure =
    agent.error && agent.status !== 'done' ? (
      <Text style={[typeStyle(t, z.step), { color: agent.status === 'refusal' ? t.colors.textSecondary : t.colors.danger }]}>{agent.status === 'refusal' ? labels.refusal : `${labels.stopped}: ${agent.error.message}`}</Text>
    ) : null

  const idle = !started ? (
    renderIdle ? (
      renderIdle(start)
    ) : (
      <Text style={[typeStyle(t, z.step), { color: t.colors.textSecondary }]}>{labels.idle}</Text>
    )
  ) : null

  const showKeys = !agent.pendingConfirmation && (!started || busy || done || !!agent.error)
  const keys = renderActions ? (
    renderActions({ started, busy, done, start, stop })
  ) : showKeys ? (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, styles.actions]}>
      {!started ? (
        <Button variant="solid" size={z.key} title={labels.run} icon={keyIcon(icons.run, Play)} onPress={start} />
      ) : busy ? (
        <Button variant="ghost" size={z.key} title={labels.cancel} onPress={stop} style={{ marginLeft: -8 }} />
      ) : (
        <Button variant="outline" size={z.key} title={labels.runAgain} icon={keyIcon(icons.again, RotateCcw)} onPress={start} />
      )}
    </View>
  ) : null

  const content = (
    <>
      {header}
      {idle}
      {steps}
      {confirm}
      {answer}
      {failure}
      {keys}
    </>
  )

  if (presentation === 'plain') {
    return (
      <View style={[{ gap: z.gap + 4 }, style, styles.container]} testID={testID}>
        {content}
      </View>
    )
  }
  return (
    <Surface elevation="card" radius={radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)} style={[{ padding: z.pad, gap: z.gap + 4 }, style, styles.container]} testID={testID}>
      {content}
    </Surface>
  )
}

/**
 * A step's mark: the variant's tile in the expressive looks; in the quiet ones a hairline ring that fills
 * once the step is done, so the list reads as a checklist.
 */
function Mark({ size, live, answer, children }: { size: number; live?: boolean; answer?: boolean; children: ReactNode }) {
  const t = useTheme()
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <View style={{ opacity: live ? 0.75 : 1 }}><SkinTile size={size}>{children}</SkinTile></View>
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: live || s.skin === 'minimal' ? 'transparent' : answer ? t.colors.surface : t.colors.muted,
        borderWidth: live || s.skin === 'minimal' ? hairlineWidth : 0,
        borderColor: t.colors.hairlineStrong,
      }}
    >
      {children}
    </View>
  )
}

export default AgentRun
