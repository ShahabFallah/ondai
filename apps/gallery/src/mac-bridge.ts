import { fetch as streamingFetch } from 'expo/fetch'
import { estimateTokens, type Availability, type OndaiErrorKind, type ProviderAdapter } from '@ondai/core'

/**
 * Apple's on-device model, served by this Mac to the iOS simulator (see bridge/main.swift and `pnpm bridge`).
 * The iOS 26.2 simulator cannot run the model itself (GenerationError -1), so in a
 * simulator the gallery sends each call to the same model running natively on the host. Phones never use this.
 */

type LanguageModel = ReturnType<NonNullable<ProviderAdapter['languageModel']>>
type EmbeddingModel = ReturnType<NonNullable<ProviderAdapter['embeddingModel']>>
type CallOptions = Parameters<LanguageModel['doGenerate']>[0]
type GenerateResult = Awaited<ReturnType<LanguageModel['doGenerate']>>
type StreamPart = Awaited<ReturnType<LanguageModel['doStream']>>['stream'] extends ReadableStream<infer P> ? P : never

export const MAC_BRIDGE_URL = 'http://127.0.0.1:8484'

interface BridgeReply {
  text?: string
  json?: string
  toolCall?: { name: string; input: string }
  error?: { kind: OndaiErrorKind; message: string }
}

class BridgeError extends Error {
  code: string
  constructor(public kind: OndaiErrorKind, message: string) {
    super(message)
    this.code = kind.toUpperCase().replace(/-/g, '_')
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))

/** Flattens the AI SDK prompt into the bridge's simple transcript: system text plus role/text turns. */
function toBody(options: CallOptions) {
  let system: string | undefined
  const messages: Array<{ role: string; text: string }> = []
  for (const m of options.prompt) {
    if (m.role === 'system') system = m.content
    else if (m.role === 'user') messages.push({ role: 'user', text: m.content.map((p) => (p.type === 'text' ? p.text : `[${p.mediaType}]`)).join('\n') })
    else if (m.role === 'assistant') {
      const text = m.content
        .map((p) => (p.type === 'text' ? p.text : p.type === 'tool-call' ? `Called ${p.toolName} with ${str(p.input)}` : ''))
        .filter(Boolean)
        .join('\n')
      if (text) messages.push({ role: 'assistant', text })
    } else if (m.role === 'tool') {
      for (const p of m.content) {
        if (p.type === 'tool-result') messages.push({ role: 'tool', text: `${p.toolName}: ${str((p.output as { value?: unknown }).value ?? p.output)}` })
      }
    }
  }
  const schema = options.responseFormat?.type === 'json' ? options.responseFormat.schema : undefined
  const tools = (options.tools ?? []).filter((t) => t.type === 'function').map((t) => ({ name: t.name, description: (t as { description?: string }).description, parameters: (t as { inputSchema?: unknown }).inputSchema }))
  return { system, messages, schema, tools: tools.length ? tools : undefined, temperature: options.temperature, maxTokens: options.maxOutputTokens }
}

function usage(input: string, output: string): GenerateResult['usage'] {
  return {
    inputTokens: { total: estimateTokens(input), noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: estimateTokens(output), text: estimateTokens(output), reasoning: undefined },
  }
}

let callId = 0

class MacBridgeModel implements LanguageModel {
  readonly specificationVersion = 'v3' as const
  readonly provider = 'apple-mac-bridge'
  readonly modelId = 'apple-foundation'
  readonly supportedUrls = {}
  constructor(private readonly base: string) {}

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<BridgeReply> {
    const res = await fetch(`${this.base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
    return (await res.json()) as BridgeReply
  }

  async doGenerate(options: CallOptions): Promise<GenerateResult> {
    const body = toBody(options)
    const reply = await this.post('/generate', body, options.abortSignal)
    if (reply.error) throw new BridgeError(reply.error.kind, reply.error.message)
    const input = body.messages.map((m) => m.text).join('\n')
    if (reply.toolCall) {
      return {
        content: [{ type: 'tool-call', toolCallId: `bridge_${callId++}`, toolName: reply.toolCall.name, input: reply.toolCall.input }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
        usage: usage(input, reply.toolCall.input),
        warnings: [],
      }
    }
    const text = reply.json ?? reply.text ?? ''
    return { content: [{ type: 'text', text }], finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(input, text), warnings: [] }
  }

  async doStream(options: CallOptions) {
    const body = toBody(options)
    const input = body.messages.map((m) => m.text).join('\n')
    // Structured output and tool choice come back whole; replay them as a one-chunk stream.
    if (body.schema || body.tools) {
      const result = await this.doGenerate(options)
      const stream = new ReadableStream<StreamPart>({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] })
          for (const part of result.content) {
            if (part.type === 'text') {
              controller.enqueue({ type: 'text-start', id: 't0' })
              controller.enqueue({ type: 'text-delta', id: 't0', delta: part.text })
              controller.enqueue({ type: 'text-end', id: 't0' })
            } else if (part.type === 'tool-call') {
              controller.enqueue(part)
            }
          }
          controller.enqueue({ type: 'finish', finishReason: result.finishReason, usage: result.usage })
          controller.close()
        },
      })
      return { stream }
    }

    const res = await streamingFetch(`${this.base}/stream`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: options.abortSignal ?? undefined })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let output = ''
    const stream = new ReadableStream<StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] })
        controller.enqueue({ type: 'text-start', id: 't0' })
        let buffer = ''
        try {
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let nl: number
            while ((nl = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, nl).trim()
              buffer = buffer.slice(nl + 1)
              if (!line) continue
              const msg = JSON.parse(line) as { delta?: string; replace?: string; done?: boolean; error?: BridgeReply['error'] }
              if (msg.error) throw new BridgeError(msg.error.kind, msg.error.message)
              const delta = msg.delta ?? (msg.replace !== undefined ? msg.replace.slice(output.length) : '')
              if (delta) {
                output += delta
                controller.enqueue({ type: 'text-delta', id: 't0', delta })
              }
            }
          }
          controller.enqueue({ type: 'text-end', id: 't0' })
          controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(input, output) })
        } catch (e) {
          controller.enqueue({ type: 'error', error: e })
        }
        controller.close()
      },
    })
    return { stream }
  }
}

class MacBridgeEmbeddings implements EmbeddingModel {
  readonly specificationVersion = 'v3' as const
  readonly provider = 'apple-mac-bridge'
  readonly modelId = 'nl-sentence-embedding'
  readonly maxEmbeddingsPerCall = 64
  readonly supportsParallelCalls = true
  constructor(private readonly base: string) {}
  async doEmbed(options: Parameters<EmbeddingModel['doEmbed']>[0]) {
    const res = await fetch(`${this.base}/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: options.values }), signal: options.abortSignal })
    const reply = (await res.json()) as { embeddings?: number[][]; error?: BridgeReply['error'] }
    if (reply.error || !reply.embeddings) throw new BridgeError(reply.error?.kind ?? 'unavailable', reply.error?.message ?? 'No embeddings from the Mac bridge.')
    return { embeddings: reply.embeddings, warnings: [] }
  }
}

/** Registered as `apple` so every component routes to it; the badge reads "Local · Mac" so nobody mistakes it for the phone. */
export function macBridgeAdapter(base = MAC_BRIDGE_URL): ProviderAdapter {
  let model: LanguageModel | undefined
  return {
    id: 'apple',
    label: 'Mac',
    locality: 'local',
    capabilities: new Set(['text', 'structured', 'tools', 'embeddings']),
    contextWindow: 4096,
    async availability(): Promise<Availability> {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 1500)
      try {
        const res = await fetch(`${base}/health`, { signal: ctrl.signal })
        const h = (await res.json()) as { available?: boolean; reason?: string }
        return h.available ? { status: 'ready', provider: 'apple' } : { status: 'unavailable', reason: 'not-enabled', detail: `The Mac's Apple model is unavailable: ${h.reason ?? 'unknown'}.`, provider: 'apple' }
      } catch {
        return { status: 'unavailable', reason: 'no-provider', detail: 'The simulator uses the Mac bridge for the real model. Run `pnpm bridge` in the repo, then check again.', provider: 'apple' }
      } finally {
        clearTimeout(timer)
      }
    },
    languageModel() {
      return model ?? (model = new MacBridgeModel(base))
    },
    embeddingModel() {
      return new MacBridgeEmbeddings(base)
    },
    classifyError(error) {
      return error instanceof BridgeError ? error.kind : /Network request failed|fetch/i.test(String(error)) ? 'network' : undefined
    },
  }
}
