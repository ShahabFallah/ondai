import { fireEvent, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Send } from 'lucide-react-native'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { PromptComposer } from './prompt-composer'

describe('PromptComposer', () => {
  it('sends the trimmed text and clears itself', async () => {
    const onSubmit = jest.fn()
    await renderWithOndai(<PromptComposer onSubmit={onSubmit} showBadge={false} />)
    await fireEvent.changeText(screen.getByLabelText('Ask anything'), '  hello  ')
    await fireEvent.press(screen.getByLabelText('Send'))
    expect(onSubmit).toHaveBeenCalledWith('hello')
  })
  it('takes labels, icons and slots', async () => {
    const onStop = jest.fn()
    await renderWithOndai(
      <PromptComposer
        onSubmit={() => {}}
        onStop={onStop}
        busy
        showBadge={false}
        labels={{ placeholder: 'Message', stop: 'Halt', remove: 'Drop' }}
        icons={{ send: Send }}
        attachments={[{ id: 'a', name: 'Receipt.jpg', kind: 'image' }]}
        onRemoveAttachment={() => {}}
        accessory={<Text>Fast</Text>}
      />,
    )
    expect(screen.getByPlaceholderText('Message')).toBeTruthy()
    expect(screen.getByLabelText('Drop Receipt.jpg')).toBeTruthy()
    expect(screen.getByText('Fast')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Halt'))
    expect(onStop).toHaveBeenCalled()
  })
  it('lets the app draw the send key', async () => {
    await renderWithOndai(<PromptComposer onSubmit={() => {}} showBadge={false} renderSend={({ canSend }) => <Text>{canSend ? 'ready' : 'empty'}</Text>} />)
    expect(screen.getByText('empty')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<PromptComposer onSubmit={() => {}} variant={variant} value="hi" showBadge={false} />)
    expect(screen.getByLabelText('Send')).toBeTruthy()
  })
})
