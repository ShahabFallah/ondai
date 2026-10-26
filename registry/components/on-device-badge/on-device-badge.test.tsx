import { screen, waitFor } from '@testing-library/react-native'
import { renderWithOndai } from '../test-utils'
import { OnDeviceBadge } from './on-device-badge'

describe('OnDeviceBadge', () => {
  it('labels the detected provider and locality', async () => {
    renderWithOndai(<OnDeviceBadge testID="badge" />, { simulate: 'apple', simulated: false })
    await waitFor(() => expect(screen.getByText('ON DEVICE · APPLE')).toBeTruthy())
  })
  it('respects explicit provider props and icon-only variant', () => {
    renderWithOndai(<OnDeviceBadge provider="llama" locality="local" variant="icon" testID="badge" />)
    expect(screen.queryByText(/LOCAL/)).toBeNull()
    expect(screen.getByLabelText(/local, llama/)).toBeTruthy()
  })
})
