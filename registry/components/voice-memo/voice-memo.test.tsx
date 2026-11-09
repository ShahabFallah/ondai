import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { VoiceMemo } from './voice-memo'

const memo = {
  title: 'Venue call',
  summary: 'Friday at noon works.',
  actions: [{ text: 'Send the deposit form', due: 'by Wednesday' }, { text: 'Book the projector' }],
}

describe('VoiceMemo', () => {
  it('reads the transcript and adds the ticked to-dos', async () => {
    const onAdd = jest.fn()
    await renderWithOndai(<VoiceMemo transcript="notes from the venue call" onAdd={onAdd} showBadge={false} />, { script: mockScript.object(memo) })
    await waitFor(() => expect(screen.getByText('Venue call')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('Book the projector'))
    await fireEvent.press(screen.getByText('Add 1 to Reminders'))
    expect(onAdd).toHaveBeenCalledWith([memo.actions[0]], expect.objectContaining({ title: 'Venue call' }))
    expect(screen.getByText('Added')).toBeTruthy()
  })

  it('takes labels and slots', async () => {
    await renderWithOndai(
      <VoiceMemo
        transcript="notes"
        onAdd={() => {}}
        labels={{ todos: 'Da fare', add: 'Aggiungi' }}
        renderAction={({ action, checked }) => <Text>{`${checked ? 'on' : 'off'}:${action.text}`}</Text>}
      />,
      { script: mockScript.object(memo) },
    )
    await waitFor(() => expect(screen.getByText('on:Book the projector')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('Aggiungi')).toBeTruthy()
  })

  it('records first when there is no transcript', async () => {
    await renderWithOndai(<VoiceMemo labels={{ record: 'Talk to me' }} />)
    expect(screen.getByText('Talk to me')).toBeTruthy()
  })

  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<VoiceMemo variant={variant} transcript="notes" onAdd={() => {}} showBadge={false} />, { script: mockScript.object(memo) })
    await waitFor(() => expect(screen.getByText('Add to Reminders')).toBeTruthy(), { timeout: 4000 })
  })
})
