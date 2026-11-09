import { render, screen, waitFor } from '@testing-library/react-native'
import type { LanguageModelV3, LanguageModelV3CallOptions } from '@ai-sdk/provider'
import { createOndai, OndaiProvider, type ProviderAdapter } from '@ondai/core'
import { mockAdapter, mockScript, type MockAdapterOptions } from '@ondai/core/mock'
import { AutoTag } from './auto-tag/auto-tag'
import { noteTags, sampleNote, sampleTagAnswer } from './auto-tag/sample-data'
import { SmartReply } from './smart-reply/smart-reply'
import { sampleReplies, sampleThread } from './smart-reply/sample-data'

/**
 * Providers that cannot take a response schema (Gemini Nano through @react-native-ai/adk 0.12 throws on one),
 * and a provider that fails outright. The components must still answer: structured calls go through the
 * prompt, and the router moves on to the next ready provider.
 */

/** Wrap a model so it behaves like ADK 0.12: a response schema throws, plain calls pass through. */
function rejectingSchema(model: LanguageModelV3): LanguageModelV3 {
  const guard = (options: LanguageModelV3CallOptions) => {
    if (options.responseFormat?.type === 'json' && options.responseFormat.schema)
      throw new Error('ADK does not support responseFormat.schema yet. Use JSON mode without a schema or omit responseFormat.')
  }
  return {
    ...model,
    doGenerate: async (o) => (guard(o), model.doGenerate(o)),
    doStream: async (o) => (guard(o), model.doStream(o)),
  }
}

/** A Nano-like adapter around the scripted mock. `declare` sets `structuredOutput` (undefined: not declared). */
function nanoLike(script: MockAdapterOptions['script'], declare?: 'prompt'): ProviderAdapter {
  const base = mockAdapter({ speed: 50, script })
  return { ...base, id: 'nano', label: 'Nano', structuredOutput: declare, languageModel: (o) => rejectingSchema(base.languageModel!(o)) }
}

async function renderWith(ui: React.ReactElement, providers: Record<string, ProviderAdapter>, order: string[]) {
  const ondai = createOndai({ providers, policy: { order, prewarm: 'never' } })
  return render(<OndaiProvider value={ondai} theme="void">{ui}</OndaiProvider>)
}

const tagJson = mockScript.text(JSON.stringify(sampleTagAnswer))

describe('structured output without a response schema', () => {
  it('fills AutoTag through the prompt on a provider that declares it', async () => {
    await renderWith(<AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={() => {}} showBadge={false} />, { nano: nanoLike(tagJson, 'prompt') }, ['nano'])
    await waitFor(() => expect(screen.getByLabelText('Add tag travel')).toBeTruthy(), { timeout: 4000 })
  })

  it('switches to the prompt by itself when a provider rejects the schema', async () => {
    await renderWith(<AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={() => {}} showBadge={false} />, { nano: nanoLike(tagJson) }, ['nano'])
    await waitFor(() => expect(screen.getByLabelText('Add tag travel')).toBeTruthy(), { timeout: 4000 })
  })

  it('reads SmartReply from reply lines on a prompt-mode provider', async () => {
    const lines = mockScript.text(sampleReplies.join('\n'))
    await renderWith(<SmartReply thread={sampleThread} onSelect={() => {}} showBadge={false} />, { nano: nanoLike(lines, 'prompt') }, ['nano'])
    await waitFor(() => expect(screen.getByText(sampleReplies[0]!)).toBeTruthy(), { timeout: 4000 })
  })
})

describe('provider fallback', () => {
  it('moves to the next ready provider when the first one fails before answering', async () => {
    const broken = mockAdapter({ speed: 50, script: mockScript.error('unavailable', 'MODEL_UNAVAILABLE: the model is not available') })
    const working = mockAdapter({ speed: 50, script: mockScript.object(sampleTagAnswer) })
    await renderWith(
      <AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={() => {}} showBadge={false} />,
      { apple: { ...broken, id: 'apple', label: 'Apple' }, nano: { ...working, id: 'nano', label: 'Nano' } },
      ['apple', 'nano'],
    )
    await waitFor(() => expect(screen.getByLabelText('Add tag travel')).toBeTruthy(), { timeout: 4000 })
  })

  it('does not fall back on a refusal', async () => {
    const refusing = mockAdapter({ speed: 50, script: mockScript.refusal() })
    const working = mockAdapter({ speed: 50, script: mockScript.object(sampleTagAnswer) })
    await renderWith(
      <AutoTag tags={noteTags} text={sampleNote} selected={[]} onChange={() => {}} showBadge={false} />,
      { apple: { ...refusing, id: 'apple', label: 'Apple' }, nano: { ...working, id: 'nano', label: 'Nano' } },
      ['apple', 'nano'],
    )
    await new Promise((r) => setTimeout(r, 600))
    expect(screen.queryByLabelText('Add tag travel')).toBeNull()
  })
})
