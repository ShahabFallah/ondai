import type { ReactElement } from 'react'
import { render } from '@testing-library/react-native'
import { createOndai, OndaiProvider } from '@ondai/core'
import { mockAdapter, type MockAdapterOptions } from '@ondai/core/mock'

/** Render inside an OndaiProvider backed by a scripted mock (speed 50× so streams finish instantly). */
export async function renderWithOndai(ui: ReactElement, mock: MockAdapterOptions = {}) {
  const adapter = mockAdapter({ speed: 50, ...mock })
  const ondai = createOndai({ providers: { mock: adapter }, policy: { order: ['mock'], prewarm: 'never' } })
  const result = await render(<OndaiProvider value={ondai} theme="void">{ui}</OndaiProvider>)
  return { ...result, ondai }
}
