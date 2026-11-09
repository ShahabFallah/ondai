import { useCallback, useMemo, useRef, useState } from 'react'
import { generateText, stepCountIs, type ToolSet } from 'ai'
import { truncateToBudget } from '../budget'
import { useOndai } from '../context'
import { OndaiError } from '../errors'
import { preselectTools, withToolPolicy, type PendingConfirmation, type ToolMeta, type ToolPolicy, type ToolStep } from '../tools'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export interface UseToolAgentOptions<T extends ToolSet> {
  tools: T
  instructions?: string
  /** Per-tool policy/risk/title. */
  meta?: Record<string, ToolMeta>
  defaultPolicy?: ToolPolicy
  /** Max tools sent to the model per request; the rest are preselected by keyword relevance. */
  maxTools?: number
  maxSteps?: number
  localOnly?: boolean
  provider?: ProviderId
  component?: string
  inputBudget?: number
}

export interface ToolAgentRunResult {
  text: string
  toolCalls: Array<{ toolName: string; input: unknown }>
  toolResults: Array<{ toolName: string; output: unknown }>
}

export interface ToolAgentState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  run: (prompt: string) => Promise<ToolAgentRunResult>
  steps: ToolStep[]
  pendingConfirmation: PendingConfirmation | null
  confirm: (editedInput?: Record<string, unknown>) => void
  cancel: (reason?: string) => void
  text: string
}

/** Tool-calling agent with a confirmation policy. Works with provider-executed loops (Apple, Nano). */
export function useToolAgent<T extends ToolSet>(options: UseToolAgentOptions<T>): ToolAgentState {
  const ondai = useOndai()
  const task = useTask(options.component)
  const [steps, setSteps] = useState<ToolStep[]>([])
  const [pending, setPending] = useState<PendingConfirmation | null>(null)
  const [text, setText] = useState('')
  const optionsRef = useRef(options)
  optionsRef.current = options

  const wrapped = useMemo(
    () =>
      withToolPolicy(options.tools, {
        meta: options.meta,
        defaultPolicy: options.defaultPolicy,
        onConfirm: (p) => {
          task.setStatus('confirm')
          setPending({
            ...p,
            confirm: (edited) => {
              setPending(null)
              task.setStatus('tool')
              p.confirm(edited)
            },
            cancel: (reason) => {
              setPending(null)
              p.cancel(reason)
            },
          })
        },
        onStep: (step) => {
          setSteps((prev) => {
            const i = prev.findIndex((s) => s.id === step.id)
            if (i === -1) return [...prev, step]
            const next = prev.slice()
            next[i] = step
            return next
          })
          if (step.status === 'running') task.setStatus('tool')
          // A finished step hands back to the model, which decides the next one.
          else if (step.status === 'done') task.setStatus('thinking')
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.tools, options.meta, options.defaultPolicy],
  )

  const run = useCallback(
    async (prompt: string) => {
      const o = optionsRef.current
      if (!prompt.trim()) throw new OndaiError('invalid-output', 'Nothing to do.')
      setSteps([])
      setText('')
      setPending(null)
      return task.execute(
        'tools',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const active = o.maxTools ? ((await preselectTools(wrapped, prompt, { k: o.maxTools, meta: o.meta })) as T) : wrapped
          const model = ctx.resolved.adapter.languageModel!({ tools: active as Record<string, unknown> })
          const result = await generateText({
            model,
            tools: active,
            system: o.instructions,
            prompt: truncateToBudget(prompt, o.inputBudget ?? Math.max(256, window - 1024)),
            abortSignal: ctx.signal,
            stopWhen: stepCountIs(o.maxSteps ?? 3),
            temperature: 0,
          })
          setText(result.text)
          return {
            text: result.text,
            toolCalls: result.steps.flatMap((s) => s.toolCalls).map((c) => ({ toolName: c.toolName, input: c.input })),
            toolResults: result.steps.flatMap((s) => s.toolResults).map((r) => ({ toolName: r.toolName, output: r.output })),
          }
        },
        { localOnly: o.localOnly, provider: o.provider },
      )
    },
    [task, ondai, wrapped],
  )

  return {
    ...task,
    run,
    steps,
    pendingConfirmation: pending,
    confirm: (edited) => pending?.confirm(edited),
    cancel: (reason) => pending?.cancel(reason),
    text,
    reset: () => {
      task.reset()
      setSteps([])
      setText('')
      setPending(null)
    },
  }
}
