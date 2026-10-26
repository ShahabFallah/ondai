import { screen, waitFor } from '@testing-library/react-native'
import { mockScript } from '@ondai/core/mock'
import { renderWithOndai } from '../test-utils'
import { SmartInput } from './smart-input'
import { expenseAliases, expenseSchema, sampleUtterance } from './sample-data'

describe('SmartInput', () => {
  it('fills fields from an off-list model answer after deterministic refinement', async () => {
    renderWithOndai(<SmartInput schema={expenseSchema} aliases={expenseAliases} presentation="overlay" initialText={sampleUtterance} autoRun showBadge={false} />, {
      script: mockScript.object({ merchant: "Luigi's", amount: '€24.50', category: 'Food & drinks', date: 'yesterday' }),
    })
    await waitFor(() => expect(screen.getByDisplayValue('food')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByDisplayValue('24.5')).toBeTruthy()
  })
})
