import { fireEvent, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Bot } from 'lucide-react-native'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { AssistantMessage, UserMessage } from './assistant-message'

const steps = [{ id: 's1', label: 'Read your notes', status: 'done' as const }]

describe('AssistantMessage', () => {
  it('fills the trace labels and opens the steps', async () => {
    await renderWithOndai(<AssistantMessage text="Hello" thoughtMs={1200} steps={steps} labels={{ thought: 'Took {time}' }} icons={{ avatar: Bot }} />)
    expect(screen.queryByText('Read your notes')).toBeNull()
    await fireEvent.press(screen.getByText('Took 1.2s'))
    expect(screen.getByText('Read your notes')).toBeTruthy()
  })
  it('takes slots for sources and actions', async () => {
    await renderWithOndai(
      <AssistantMessage
        text="Hello"
        sources={[{ id: 'a', title: 'Budget' }]}
        renderSource={(s, i) => <Text>{`src:${i}:${s.title}`}</Text>}
        renderActions={({ copy }) => <Text onPress={copy}>share</Text>}
      />,
    )
    expect(screen.getByText('src:0:Budget')).toBeTruthy()
    expect(screen.getByText('share')).toBeTruthy()
  })
  it('offers retry only once the reply is over', async () => {
    const onRetry = jest.fn()
    const { rerender } = await renderWithOndai(<AssistantMessage text="Hel" status="streaming" onRetry={onRetry} labels={{ retry: 'Again' }} />)
    expect(screen.queryByLabelText('Again')).toBeNull()
    await rerender(<AssistantMessage text="" status="error" onRetry={onRetry} labels={{ retry: 'Again', error: 'Broke' }} />)
    expect(screen.getByText('Broke')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Again'))
    expect(onRetry).toHaveBeenCalled()
  })
  it.each(skinNames)('renders the %s variant with its bubble', async (variant) => {
    await renderWithOndai(
      <>
        <UserMessage text="Question" variant={variant} />
        <AssistantMessage text="Answer" variant={variant} presentation="card" />
      </>,
    )
    expect(screen.getByText('Question')).toBeTruthy()
    expect(screen.getByLabelText('Copy')).toBeTruthy()
  })
})
