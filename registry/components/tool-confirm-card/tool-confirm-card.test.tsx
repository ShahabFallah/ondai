import { fireEvent, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Hammer } from 'lucide-react-native'
import type { PendingConfirmation } from '@ondai/core'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { ToolConfirmCard } from './tool-confirm-card'

const pending = (over: Partial<PendingConfirmation> = {}): PendingConfirmation => ({
  id: 'p1',
  toolName: 'createEvent',
  title: 'Create the event',
  input: { when: 'Sat, 8:00 PM', where: "Luigi's" },
  risk: 'medium',
  confirm: jest.fn(),
  cancel: jest.fn(),
  ...over,
})

describe('ToolConfirmCard', () => {
  it('confirms with the input and denies with cancel', async () => {
    const p = pending()
    await renderWithOndai(<ToolConfirmCard pending={p} />)
    expect(screen.getByText('Create the event?')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Confirm'))
    expect(p.confirm).toHaveBeenCalledWith({ when: 'Sat, 8:00 PM', where: "Luigi's" })
    await fireEvent.press(screen.getByLabelText('Deny'))
    expect(p.cancel).toHaveBeenCalled()
  })
  it('sends edited values', async () => {
    const onApprove = jest.fn()
    await renderWithOndai(<ToolConfirmCard pending={pending()} defaultEditing fieldLabels={{ when: 'At' }} onApprove={onApprove} />)
    await fireEvent.changeText(screen.getByLabelText('At'), 'Sun, 7:00 PM')
    await fireEvent.press(screen.getByLabelText('Confirm'))
    expect(onApprove).toHaveBeenCalledWith({ when: 'Sun, 7:00 PM', where: "Luigi's" })
  })
  it('takes labels, icons and slots', async () => {
    await renderWithOndai(
      <ToolConfirmCard
        pending={pending()}
        labels={{ wantsToRun: 'Run', riskMedium: 'Check' }}
        icons={{ tool: Hammer, riskMedium: null }}
        renderField={({ label, text }) => <Text>{`${label}=${text}`}</Text>}
        renderActions={({ approve }) => <Text onPress={approve}>go</Text>}
      />,
    )
    expect(screen.getByText('Run')).toBeTruthy()
    expect(screen.getByText('Check')).toBeTruthy()
    expect(screen.getByText('When=Sat, 8:00 PM')).toBeTruthy()
    expect(screen.getByText('go')).toBeTruthy()
  })
  it('collapses once answered and shows the empty slot', async () => {
    const { rerender } = await renderWithOndai(<ToolConfirmCard pending={pending()} status="denied" labels={{ skipped: 'Passed on', denied: 'No thanks' }} />)
    expect(screen.getByText('Passed on')).toBeTruthy()
    expect(screen.getByText('No thanks')).toBeTruthy()
    await rerender(<ToolConfirmCard pending={null} renderEmpty={() => <Text>nothing waiting</Text>} />)
    expect(screen.getByText('nothing waiting')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<ToolConfirmCard pending={pending()} variant={variant} />)
    expect(screen.getByLabelText('Confirm')).toBeTruthy()
  })
})
