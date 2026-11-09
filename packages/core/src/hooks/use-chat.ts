import { useCallback, useRef, useState } from 'react'
import { streamText } from 'ai'
import { estimateTokens } from '../budget'
import { fitHistory, type ChatMessage } from '../history'
import { useOndai } from '../context'
import { OndaiError, toOndaiError } from '../errors'
import type { ProviderId } from '../types'
import { useTask, type TaskController } from './use-task'

export type { ChatMessage } from '../history'

export interface UseChatOptions {
  system?: string
  initialMessages?: ChatMessage[]
  localOnly?: boolean
  provider?: ProviderId
  component?: string
  maxOutputTokens?: number
  temperature?: number
  /** Input tokens for history + the new turn; the oldest turns are dropped first (default: context window - 512). */
  inputBudget?: number
}

export interface ChatState extends Omit<TaskController, 'execute' | 'signal' | 'setStatus'> {
  messages: ChatMessage[]
  isThinking: boolean
  isStreaming: boolean
  isBusy: boolean
  /** Send a user turn and stream the reply. Resolves with the reply text. */
  send: (text: string) => Promise<string>
  /** Drop the last reply and ask again. */
  retry: () => Promise<string>
}

let seq = 0
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

/** A multi-turn conversation with the best on-device model, streamed. */
export function useChat(options: UseChatOptions = {}): ChatState {
  const ondai = useOndai()
  const task = useTask(options.component ?? 'chat')
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? [])
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const optionsRef = useRef(options)
  optionsRef.current = options

  const patch = (id: string, change: Partial<ChatMessage>) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...change } : m)))

  const ask = useCallback(
    async (history: ChatMessage[]) => {
      const o = optionsRef.current
      const reply: ChatMessage = { id: nextId(), role: 'assistant', text: '', status: 'thinking' }
      setMessages([...history, reply])
      const started = Date.now()
      try {
        return await task.execute(
          'text',
          async (ctx) => {
            const budget = o.inputBudget ?? Math.max(512, (ctx.resolved.adapter.contextWindow ?? ondai.policy.tokenBudget) - 512)
            const result = streamText({
              model: ctx.resolved.adapter.languageModel!(),
              system: o.system,
              messages: fitHistory(history, budget),
              abortSignal: ctx.signal,
              maxOutputTokens: o.maxOutputTokens,
              temperature: o.temperature,
              onError: () => {},
            })
            let acc = ''
            for await (const part of result.fullStream) {
              if (part.type === 'text-delta') {
                if (!acc) {
                  ctx.firstToken()
                  patch(reply.id, { thoughtMs: Date.now() - started })
                }
                acc += part.text
                ctx.tokens(estimateTokens(acc))
                ctx.setStatus('streaming')
                patch(reply.id, { text: acc, status: 'streaming' })
              } else if (part.type === 'error') {
                throw part.error
              }
            }
            patch(reply.id, { status: 'done' })
            return acc
          },
          { localOnly: o.localOnly, provider: o.provider },
        )
      } catch (e) {
        const error = toOndaiError(e)
        patch(reply.id, { status: error.kind === 'refusal' ? 'refusal' : error.kind === 'cancelled' ? 'done' : 'error', error })
        throw error
      }
    },
    [task, ondai],
  )

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return Promise.reject(new OndaiError('invalid-output', 'Nothing to send.'))
      return ask([...messagesRef.current, { id: nextId(), role: 'user', text: text.trim() }])
    },
    [ask],
  )

  const retry = useCallback(() => {
    const prev = messagesRef.current
    const last = prev[prev.length - 1]
    return ask(last?.role === 'assistant' ? prev.slice(0, -1) : prev)
  }, [ask])

  return {
    ...task,
    messages,
    isThinking: task.status === 'thinking',
    isStreaming: task.status === 'streaming',
    isBusy: task.status === 'thinking' || task.status === 'streaming',
    send,
    retry,
    reset: () => {
      task.reset()
      setMessages(optionsRef.current.initialMessages ?? [])
    },
  }
}
