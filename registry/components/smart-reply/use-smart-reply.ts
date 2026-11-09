import { useCallback, useRef, useState } from 'react'
import { generateText, Output, rejectsSchema, truncateToBudget, useOndai, useTask, type TaskController } from '@ondai/core'
import { parseReplyLines, smartReplyInstructions, type ReplyTone } from './prompts'
import { repliesSchema } from './schema'

export interface ThreadMessage {
  from: 'me' | 'them' | string
  text: string
}

export interface UseSmartReplyOptions {
  count?: number
  tone?: ReplyTone
  instructions?: string
  component?: string
  localOnly?: boolean
}

export interface SmartReplyState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  replies: string[]
  isBusy: boolean
  run: (thread: ThreadMessage[] | string, tone?: ReplyTone) => Promise<string[]>
}

export function threadToPrompt(thread: ThreadMessage[] | string): string {
  if (typeof thread === 'string') return `Last message:\n${thread}`
  const last = thread.slice(-6)
  return last.map((m) => `${m.from === 'me' ? 'Me' : m.from === 'them' ? 'Them' : m.from}: ${m.text}`).join('\n')
}

/** Three reply suggestions for the last message in a thread. Structured output, line parsing as fallback. */
export function useSmartReply(options: UseSmartReplyOptions = {}): SmartReplyState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'smart-reply')
  const [replies, setReplies] = useState<string[]>([])
  const optionsRef = useRef(options)
  optionsRef.current = options

  const run = useCallback(
    async (thread: ThreadMessage[] | string, toneOverride?: ReplyTone) => {
      const o = optionsRef.current
      const count = o.count ?? 3
      const tone = toneOverride ?? o.tone ?? 'neutral'
      setReplies([])
      return task.execute(
        'text',
        async (ctx) => {
          const window = ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget
          const model = ctx.resolved.adapter.languageModel!()
          const system = smartReplyInstructions(count, tone, o.instructions)
          const prompt = truncateToBudget(threadToPrompt(thread), Math.max(300, window - 500), 'end')
          let out: string[] = []
          // Schema-guided first where the provider takes a schema; reply lines otherwise.
          if (ctx.resolved.adapter.capabilities.has('structured') && ctx.resolved.adapter.structuredOutput !== 'prompt') {
            try {
              const r = await generateText({ model, system: `${system} Return JSON with a "replies" array.`, prompt, output: Output.object({ schema: repliesSchema }), abortSignal: ctx.signal, temperature: 0.6 })
              out = r.output.replies.map((s) => s.trim()).filter(Boolean)
            } catch (e) {
              if (ondai.classify(e, ctx.resolved.provider) !== 'invalid-output' && !rejectsSchema(e)) throw e
            }
          }
          if (!out.length) {
            const r = await generateText({ model, system: `${system} One reply per line.`, prompt, abortSignal: ctx.signal, temperature: 0.6 })
            out = parseReplyLines(r.text, count)
          }
          ctx.firstToken()
          const unique = [...new Set(out)].slice(0, count)
          setReplies(unique)
          return unique
        },
        { localOnly: o.localOnly },
      )
    },
    [task, ondai],
  )

  return { ...task, replies, isBusy: task.status === 'thinking' || task.status === 'streaming', run, reset: () => (task.reset(), setReplies([])) }
}
