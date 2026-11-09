import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { Chat } from './chat'

describe('Chat', () => {
  it('sends a suggestion and shows the reply', async () => {
    await renderWithOndai(<Chat suggestions={['Plan Saturday']} showBadge={false} labels={{ emptyTitle: 'Hi there' }} />, { script: mockScript.text('Coffee first.') })
    expect(screen.getByText('Hi there')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Plan Saturday'))
    await waitFor(() => expect(screen.getByText('Coffee first.')).toBeTruthy(), { timeout: 5000 })
  })
  it('takes the empty slot', async () => {
    await renderWithOndai(<Chat showBadge={false} renderEmpty={({ suggestions }) => <Text>{`welcome:${suggestions.length}`}</Text>} suggestions={['a', 'b']} />)
    expect(screen.getByText('welcome:2')).toBeTruthy()
  })
  it('takes a suggestion slot', async () => {
    await renderWithOndai(<Chat showBadge={false} suggestions={['a']} renderSuggestion={(s) => <Text>{`sg:${s}`}</Text>} />)
    expect(screen.getByText('sg:a')).toBeTruthy()
  })
  it('passes labels to the composer', async () => {
    await renderWithOndai(<Chat showBadge={false} labels={{ placeholder: 'Message' }} />)
    expect(screen.getByPlaceholderText('Message')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<Chat showBadge={false} variant={variant} suggestions={['a']} initialMessages={[{ id: 'u', role: 'user', text: 'Hey' }, { id: 'a', role: 'assistant', text: 'Hello', status: 'done' }]} />)
    expect(screen.getByText('Hey')).toBeTruthy()
  })
})
