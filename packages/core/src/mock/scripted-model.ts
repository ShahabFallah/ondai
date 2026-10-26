import type {
  EmbeddingModelV3,
  EmbeddingModelV3CallOptions,
  EmbeddingModelV3Result,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
  SpeechModelV3,
  SpeechModelV3CallOptions,
  TranscriptionModelV3,
  TranscriptionModelV3CallOptions,
} from '@ai-sdk/provider'
import { estimateTokens } from '../budget'
import { errorMessages } from '../errors'
import { realClock, type Clock } from './clock'
import { seededRandom, tokenizeForStream, toScript, type MockScript, type MockScriptInput } from './scripts'

export interface MockCallInfo {
  callIndex: number
  /** Last user text in the prompt. */
  prompt: string
  system?: string
  responseFormat?: LanguageModelV3CallOptions['responseFormat']
  toolNames: string[]
}

export type ScriptSource = MockScriptInput | ((call: MockCallInfo) => MockScriptInput)

export interface ScriptedModelOptions {
  script: ScriptSource
  clock?: Clock
  /** Multiplier on streaming speed (1 = script tps). */
  speed?: number
  provider?: string
  modelId?: string
}

let callCounter = 0

export function promptText(prompt: LanguageModelV3CallOptions['prompt']): { prompt: string; system?: string } {
  let system: string | undefined
  let last = ''
  for (const m of prompt) {
    if (m.role === 'system') system = m.content
    if (m.role === 'user') {
      last = m.content
        .map((p) => (p.type === 'text' ? p.text : `[${p.mediaType}]`))
        .join('\n')
    }
  }
  return { prompt: last, system }
}

function usage(inputText: string, outputText: string): LanguageModelV3Usage {
  return {
    inputTokens: { total: estimateTokens(inputText), noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: estimateTokens(outputText), text: estimateTokens(outputText), reasoning: undefined },
  }
}

/**
 * A real `LanguageModelV3` whose output is scripted, so `generateText`, `streamText`, `Output.object`
 * and tool calling all run the genuine AI SDK code path on the web and in tests.
 */
export class ScriptedLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const
  readonly provider: string
  readonly modelId: string
  readonly supportedUrls = {}
  private readonly clock: Clock
  private readonly speed: number
  private readonly source: ScriptSource
  private calls = 0

  constructor(options: ScriptedModelOptions) {
    this.provider = options.provider ?? 'mock'
    this.modelId = options.modelId ?? 'scripted'
    this.clock = options.clock ?? realClock
    this.speed = options.speed ?? 1
    this.source = options.script
  }

  private scriptFor(options: LanguageModelV3CallOptions): MockScript {
    const { prompt, system } = promptText(options.prompt)
    const info: MockCallInfo = {
      callIndex: this.calls++,
      prompt,
      system,
      responseFormat: options.responseFormat,
      toolNames: (options.tools ?? []).map((t) => t.name),
    }
    return toScript(typeof this.source === 'function' ? this.source(info) : this.source)
  }

  async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const script = this.scriptFor(options)
    const content: LanguageModelV3Content[] = []
    let text = ''
    let finish: LanguageModelV3GenerateResult['finishReason'] = { unified: 'stop', raw: 'stop' }
    for (const step of script.steps) {
      switch (step.type) {
        case 'thinking':
        case 'delay':
          await this.clock.sleep(step.ms / this.speed)
          break
        case 'stream':
        case 'text':
          text += step.text
          break
        case 'object': {
          await this.clock.sleep(step.delayMs / this.speed)
          text += JSON.stringify(step.value)
          break
        }
        case 'toolCall': {
          await this.clock.sleep(step.delayMs / this.speed)
          const id = `call_${callCounter++}`
          const providerExecuted = step.result !== undefined
          content.push({ type: 'tool-call', toolCallId: id, toolName: step.name, input: JSON.stringify(step.input), providerExecuted })
          if (providerExecuted) content.push({ type: 'tool-result', toolCallId: id, toolName: step.name, result: step.result as never, providerExecuted: true } as never)
          finish = { unified: 'tool-calls', raw: 'tool-calls' }
          break
        }
        case 'error': {
          await this.clock.sleep(step.delayMs / this.speed)
          const err = new Error(step.message ?? errorMessages[step.kind]) as Error & { code: string }
          err.code = step.kind.toUpperCase().replace(/-/g, '_')
          throw err
        }
      }
    }
    if (text) content.unshift({ type: 'text', text })
    return { content, finishReason: finish, usage: usage(promptText(options.prompt).prompt, text), warnings: [] }
  }

  async doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
    const script = this.scriptFor(options)
    const clock = this.clock
    const speed = this.speed
    const rand = seededRandom(script.seed ?? 1)
    const inputText = promptText(options.prompt).prompt
    let textId = 0
    let outText = ''

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      start: async (controller) => {
        const emit = (part: LanguageModelV3StreamPart) => controller.enqueue(part)
        emit({ type: 'stream-start', warnings: [] })
        let finish: 'stop' | 'tool-calls' = 'stop'
        try {
          for (const step of script.steps) {
            if (options.abortSignal?.aborted) break
            switch (step.type) {
              case 'thinking':
              case 'delay':
                await clock.sleep(step.ms / speed)
                break
              case 'text': {
                const id = `t${textId++}`
                emit({ type: 'text-start', id })
                emit({ type: 'text-delta', id, delta: step.text })
                emit({ type: 'text-end', id })
                outText += step.text
                break
              }
              case 'stream': {
                const id = `t${textId++}`
                emit({ type: 'text-start', id })
                const tokens = tokenizeForStream(step.text, step.by)
                const base = 1000 / Math.max(1, step.tps * speed)
                for (const tok of tokens) {
                  if (options.abortSignal?.aborted) break
                  await clock.sleep(base * (0.6 + rand() * 0.8))
                  emit({ type: 'text-delta', id, delta: tok })
                  outText += tok
                }
                emit({ type: 'text-end', id })
                break
              }
              case 'object': {
                await clock.sleep(step.delayMs / speed)
                const id = `t${textId++}`
                const json = JSON.stringify(step.value)
                emit({ type: 'text-start', id })
                emit({ type: 'text-delta', id, delta: json })
                emit({ type: 'text-end', id })
                outText += json
                break
              }
              case 'toolCall': {
                await clock.sleep(step.delayMs / speed)
                const id = `call_${callCounter++}`
                const providerExecuted = step.result !== undefined
                const input = JSON.stringify(step.input)
                emit({ type: 'tool-input-start', id, toolName: step.name, providerExecuted })
                emit({ type: 'tool-input-delta', id, delta: input })
                emit({ type: 'tool-input-end', id })
                emit({ type: 'tool-call', toolCallId: id, toolName: step.name, input, providerExecuted })
                if (providerExecuted) emit({ type: 'tool-result', toolCallId: id, toolName: step.name, result: step.result as never, providerExecuted: true } as never)
                finish = 'tool-calls'
                break
              }
              case 'error': {
                await clock.sleep(step.delayMs / speed)
                const err = new Error(step.message ?? errorMessages[step.kind]) as Error & { code: string }
                err.code = step.kind.toUpperCase().replace(/-/g, '_')
                emit({ type: 'error', error: err })
                emit({ type: 'finish', finishReason: { unified: 'error', raw: step.kind }, usage: usage(inputText, outText) })
                controller.close()
                return
              }
            }
          }
          emit({ type: 'finish', finishReason: { unified: finish, raw: finish }, usage: usage(inputText, outText) })
        } catch (e) {
          emit({ type: 'error', error: e })
        }
        controller.close()
      },
    })
    return { stream }
  }
}

/** Deterministic pseudo-embeddings: hashed bag of character trigrams, L2-normalized. */
export function pseudoEmbedding(text: string, dimension = 64): number[] {
  const v = new Array<number>(dimension).fill(0)
  const s = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  for (let i = 0; i < s.length - 2; i++) {
    let h = 2166136261
    for (let j = i; j < i + 3; j++) h = Math.imul(h ^ s.charCodeAt(j), 16777619)
    const idx = (h >>> 0) % dimension
    v[idx] = (v[idx] ?? 0) + 1
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1
  return v.map((x) => x / norm)
}

export class ScriptedEmbeddingModel implements EmbeddingModelV3 {
  readonly specificationVersion = 'v3' as const
  readonly provider = 'mock'
  readonly modelId = 'pseudo-embedding'
  readonly maxEmbeddingsPerCall = 256
  readonly supportsParallelCalls = true
  constructor(readonly dimension = 64) {}
  async doEmbed(options: EmbeddingModelV3CallOptions): Promise<EmbeddingModelV3Result> {
    return { embeddings: options.values.map((t) => pseudoEmbedding(t, this.dimension)), warnings: [] }
  }
}

export class ScriptedTranscriptionModel implements TranscriptionModelV3 {
  readonly specificationVersion = 'v3' as const
  readonly provider = 'mock'
  readonly modelId = 'scripted-transcription'
  constructor(private readonly text: string, private readonly clock: Clock = realClock, private readonly delayMs = 600) {}
  async doGenerate(_options: TranscriptionModelV3CallOptions) {
    await this.clock.sleep(this.delayMs)
    return {
      text: this.text,
      segments: [{ text: this.text, startSecond: 0, endSecond: 2 }],
      language: 'en',
      durationInSeconds: 2,
      warnings: [],
      response: { timestamp: new Date(this.clock.now()), modelId: this.modelId },
    }
  }
}

export class ScriptedSpeechModel implements SpeechModelV3 {
  readonly specificationVersion = 'v3' as const
  readonly provider = 'mock'
  readonly modelId = 'scripted-speech'
  async doGenerate(_options: SpeechModelV3CallOptions) {
    return { audio: new Uint8Array(0), warnings: [], response: { timestamp: new Date(), modelId: this.modelId } }
  }
}
