import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { SmartInput } from './smart-input'
import { expenseAliases, expenseSchema, sampleUtterance } from './sample-data'

describe('SmartInput', () => {
  it('fills fields from an off-list model answer after deterministic refinement', async () => {
    await renderWithOndai(<SmartInput schema={expenseSchema} aliases={expenseAliases} presentation="overlay" initialText={sampleUtterance} autoRun showBadge={false} />, {
      script: mockScript.object({ merchant: "Luigi's", amount: '€24.50', category: 'Food & drinks', date: 'yesterday' }),
    })
    await waitFor(() => expect(screen.getByDisplayValue('food')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByDisplayValue('24.5')).toBeTruthy()
  })
  it('takes labels, field labels, slots and the use key', async () => {
    const onUse = jest.fn()
    await renderWithOndai(
      <SmartInput
        schema={expenseSchema}
        initialText={sampleUtterance}
        autoRun
        showBadge={false}
        onUse={onUse}
        labels={{ placeholder: 'Descrivi', use: 'Usa questi' }}
        fieldLabels={{ merchant: 'Esercente' }}
        renderField={({ label, value }) => <Text>{`${label}=${value}`}</Text>}
      />,
      { script: mockScript.object({ merchant: "Luigi's", amount: 24.5, category: 'food' }) },
    )
    await waitFor(() => expect(screen.getByText("Esercente=Luigi's")).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByPlaceholderText('Descrivi')).toBeTruthy()
    fireEvent.press(screen.getByText('Usa questi'))
    expect(onUse).toHaveBeenCalledWith(expect.objectContaining({ merchant: "Luigi's" }))
  })
  it('shows the empty slot before anything is filled', async () => {
    await renderWithOndai(<SmartInput schema={expenseSchema} showBadge={false} renderEmpty={() => <Text>tip</Text>} />)
    expect(screen.getByText('tip')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(
      <>
        <SmartInput schema={expenseSchema} variant={variant} showBadge={false} />
        <SmartInput schema={expenseSchema} variant={variant} presentation="composer" size="lg" tint="#FF5A5F" showBadge={false} />
      </>,
    )
    expect(screen.getAllByLabelText('Fill the form')).toHaveLength(2)
  })
})
