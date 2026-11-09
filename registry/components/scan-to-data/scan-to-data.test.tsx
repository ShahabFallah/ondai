import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { ScanToData } from './scan-to-data'
import { cardAnswer, cardOcr } from './sample-data'

describe('ScanToData', () => {
  it('extracts a business card and hands it to onUse', async () => {
    const onUse = jest.fn()
    await renderWithOndai(<ScanToData preset="businessCard" initialText={cardOcr} autoRun onUse={onUse} showBadge={false} />, { script: mockScript.object(cardAnswer) })
    await waitFor(() => expect(screen.getByText('Priya Natarajan')).toBeTruthy(), { timeout: 5000 })
    fireEvent.press(screen.getByText('Use these'))
    expect(onUse).toHaveBeenCalledWith(expect.objectContaining({ name: 'Priya Natarajan' }))
  })
  it('takes labels, field labels and a row slot', async () => {
    await renderWithOndai(
      <ScanToData
        preset="businessCard"
        initialText={cardOcr}
        autoRun
        showBadge={false}
        labels={{ use: 'Salva', subject: 'biglietto' }}
        fieldLabels={{ name: 'Nome' }}
        renderRow={({ label, value }) => <Text>{`${label}=${value}`}</Text>}
      />,
      { script: mockScript.object(cardAnswer) },
    )
    await waitFor(() => expect(screen.getByText('Nome=Priya Natarajan')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText('Salva')).toBeTruthy()
  })
  it('explains when no OCR provider is connected', async () => {
    await renderWithOndai(<ScanToData showBadge={false} />)
    expect(screen.getByText('Scan a receipt')).toBeTruthy()
    expect(screen.getByText('Connect an OCR provider to read photos.')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<ScanToData variant={variant} ocr={async () => ''} showBadge={false} tint="#3B82F6" />)
    expect(screen.getByText('Take photo')).toBeTruthy()
  })
})
