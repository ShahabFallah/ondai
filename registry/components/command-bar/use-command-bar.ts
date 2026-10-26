import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tool, type ToolSet } from '@ondai/core'
import { z } from 'zod'
import { matchEnum, normalizeText, similarity, useLocalModel, useOndai, useStructured, useToolAgent, type PendingConfirmation, type ToolMeta, type ToolStep } from '@ondai/core'
import type { AiState } from '@ondai/tokens'
import type { CommandAction } from './actions'
import { commandInstructions } from './prompts'
import { actionChoiceSchema } from './schema'

export interface UseCommandBarOptions {
  actions: Array<CommandAction<any>>
  /** Extra guidance for the model (app name, domain words). */
  instructions?: string
  /** How many tools are sent to the model (the rest are preselected by relevance). */
  maxTools?: number
  /** Suggestions shown before the model runs. */
  maxSuggestions?: number
  /** Called after an action ran. */
  onRun?: (action: CommandAction<any>, params: Record<string, unknown>, result: unknown) => void
  component?: string
}

export interface CommandResult {
  action: CommandAction<any>
  params: Record<string, unknown>
  preview?: string
  result?: unknown
  /** Which rung of the ladder produced it. */
  via: 'tools' | 'structured' | 'keyword'
}

export interface CommandBarState {
  query: string
  setQuery: (q: string) => void
  suggestions: Array<CommandAction<any>>
  submit: (q?: string) => Promise<CommandResult | null>
  runAction: (action: CommandAction<any>, params?: Record<string, unknown>) => Promise<CommandResult>
  status: AiState
  result: CommandResult | null
  text: string
  error: Error | null
  pendingConfirmation: PendingConfirmation | null
  confirm: (edited?: Record<string, unknown>) => void
  cancel: () => void
  steps: ToolStep[]
  reset: () => void
  /** Which rung the device supports: tools → structured → keyword. */
  mode: 'tools' | 'structured' | 'keyword'
  provider?: string
  locality?: string
}

/** Score actions against a query with keywords and fuzzy similarity. Deterministic, instant. */
export function rankActions(actions: Array<CommandAction<any>>, query: string, limit = 6): Array<CommandAction<any>> {
  const q = normalizeText(query)
  if (!q) return actions.slice(0, limit)
  const scored = actions.map((a) => {
    const hay = normalizeText([a.title, a.description ?? '', ...(a.keywords ?? [])].join(' '))
    const tokens = q.split(' ')
    let overlap = 0
    for (const tk of tokens) if (hay.split(' ').some((h) => h === tk || (tk.length > 2 && h.startsWith(tk)))) overlap++
    const score = (overlap / tokens.length) * 0.7 + similarity(q, normalizeText(a.title)) * 0.3
    return { a, score }
  })
  return scored
    .filter((s) => s.score > 0.15)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((s) => s.a)
}

/** Natural-language → one registered action. Tool calling when available, structured enum otherwise, keyword search always. */
export function useCommandBar(options: UseCommandBarOptions): CommandBarState {
  const { actions, instructions, maxTools = 5, maxSuggestions = 6, onRun, component = 'command-bar' } = options
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<CommandResult | null>(null)
  const ondai = useOndai()
  const toolsModel = useLocalModel('tools')
  const structuredModel = useLocalModel('structured')
  const mode: CommandBarState['mode'] = toolsModel.isReady ? 'tools' : structuredModel.isReady ? 'structured' : 'keyword'
  const byId = useMemo(() => new Map(actions.map((a) => [a.id, a])), [actions])
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun

  const runAction = useCallback(
    async (action: CommandAction<any>, params: Record<string, unknown> = {}, via: CommandResult['via'] = 'keyword') => {
      const out = await action.run(params)
      const r: CommandResult = { action, params, preview: action.preview?.(params), result: out, via }
      setResult(r)
      onRunRef.current?.(action, params, out)
      return r
    },
    [],
  )

  // Tools rung: one AI SDK tool per action; risky actions ask first.
  const tools = useMemo<ToolSet>(() => {
    const set: ToolSet = {}
    for (const a of actions) {
      set[toolName(a.id)] = tool({
        description: [a.title, a.description, a.keywords?.length ? `Keywords: ${a.keywords.join(', ')}` : ''].filter(Boolean).join('. '),
        inputSchema: a.params ?? z.object({}),
        execute: async (input) => {
          const r = await runAction(a, input as Record<string, unknown>, 'tools')
          return r.preview ?? r.result ?? 'done'
        },
      })
    }
    return set
  }, [actions, runAction])
  const meta = useMemo<Record<string, ToolMeta>>(() => Object.fromEntries(actions.map((a) => [toolName(a.id), { title: a.title, risk: a.risk ?? 'low', policy: a.risk === 'high' ? 'ask' : 'auto' }])), [actions])
  const agent = useToolAgent({ tools, meta, instructions: [commandInstructions(true), instructions].filter(Boolean).join(' '), maxTools, maxSteps: 2, component })

  // Structured rung.
  const ids = actions.map((a) => a.id) as [string, ...string[]]
  const structured = useStructured({
    schema: actionChoiceSchema(ids.length ? ids : ['none']),
    instructions: [commandInstructions(false), `Action ids: ${actions.map((a) => `${a.id} (${a.title})`).join('; ')}.`, instructions].filter(Boolean).join(' '),
    component,
    refine: (obj) => {
      const m = matchEnum(obj.action, ids)
      return m ? { object: { ...obj, action: m.value }, confidence: m.score } : obj
    },
  })

  const submit = useCallback(
    async (q?: string) => {
      const text = (q ?? query).trim()
      if (!text) return null
      setResult(null)
      // Resolve the rung now (hook state may not have settled on first render).
      const toolsReady = (await ondai.availability('tools')).status === 'ready'
      const structuredReady = !toolsReady && (await ondai.availability('structured')).status === 'ready'
      const rung: CommandBarState['mode'] = toolsReady ? 'tools' : structuredReady ? 'structured' : 'keyword'
      if (rung === 'tools') {
        const r = await agent.run(text)
        const call = r.toolCalls[0]
        if (call) {
          const a = byId.get(fromToolName(call.toolName))
          if (a) {
            const res: CommandResult = { action: a, params: (call.input as Record<string, unknown>) ?? {}, preview: a.preview?.(call.input as never), result: r.toolResults[0]?.output, via: 'tools' }
            setResult(res)
            return res
          }
        }
        // Model found nothing: fall through to keyword.
      } else if (rung === 'structured') {
        const obj = await structured.run(text)
        const a = byId.get(obj.action)
        if (a) {
          const params = a.params ? paramsFromArgument(a.params, obj.argument) : {}
          return runAction(a, params, 'structured')
        }
      }
      const best = rankActions(actions, text, 1)[0]
      if (!best) return null
      const params = best.params ? paramsFromArgument(best.params, text) : {}
      return runAction(best, params, 'keyword')
    },
    [query, ondai, agent, structured, byId, actions, runAction],
  )

  const suggestions = useMemo(() => rankActions(actions, query, maxSuggestions), [actions, query, maxSuggestions])
  const status: AiState = mode === 'tools' ? agent.status : mode === 'structured' ? structured.status : 'idle'
  const error = mode === 'tools' ? agent.error : mode === 'structured' ? structured.error : null

  useEffect(() => {
    if (toolsModel.isReady && toolsModel.provider) void toolsModel.prewarm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsModel.isReady])

  return {
    query,
    setQuery,
    suggestions,
    submit,
    runAction: (a, p) => runAction(a, p, 'keyword'),
    status,
    result,
    text: agent.text,
    error,
    pendingConfirmation: agent.pendingConfirmation,
    confirm: agent.confirm,
    cancel: agent.cancel,
    steps: agent.steps,
    reset: () => {
      setQuery('')
      setResult(null)
      agent.reset()
      structured.reset()
    },
    mode,
    provider: toolsModel.provider ?? structuredModel.provider,
    locality: toolsModel.locality ?? structuredModel.locality,
  }
}

/** Tool names must be identifiers; action ids may contain ':' or '/'. */
export function toolName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}
const reverse = new Map<string, string>()
function fromToolName(name: string): string {
  return reverse.get(name) ?? name
}
export function registerToolNames(actions: Array<CommandAction<any>>) {
  for (const a of actions) reverse.set(toolName(a.id), a.id)
}

/** Without tool calling, fill the first string param with the argument text. */
function paramsFromArgument(schema: z.ZodObject<z.ZodRawShape>, argument: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, f] of Object.entries(schema.shape)) {
    const def = (f as { def?: { type?: string } }).def
    const inner = (def as { innerType?: { def?: { type?: string } } } | undefined)?.innerType?.def?.type
    if (def?.type === 'string' || (def?.type === 'optional' && inner === 'string')) {
      out[k] = argument
      break
    }
  }
  return out
}
