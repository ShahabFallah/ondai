import { screen, waitFor } from '@testing-library/react-native'
import { mockScript } from '@ondai/core/mock'
import { renderWithOndai } from '../test-utils'
import { Summarize } from './summarize'
import { sampleThread } from './sample-data'

describe('Summarize', () => {
  it('streams a scripted summary into the card', async () => {
    renderWithOndai(<Summarize text={sampleThread} length="bullets" showBadge={false} />, { script: mockScript.text('- Venue Friday noon\n- Budget revised') })
    await waitFor(() => expect(screen.getByText(/Venue Friday noon/)).toBeTruthy(), { timeout: 4000 })
  })
  it('shows a calm refusal without a retry button', async () => {
    renderWithOndai(<Summarize text={sampleThread} showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText(/declined/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it('renders the unavailable state when no model is ready', async () => {
    renderWithOndai(<Summarize text={sampleThread} showBadge={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/not supported/)).toBeTruthy())
  })
})
