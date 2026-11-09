import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Shuffle } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { SmartReply } from './smart-reply'
import { sampleReplies, sampleThread } from './sample-data'

const replies = () => mockScript.object({ replies: sampleReplies })

describe('SmartReply', () => {
  it('suggests replies and sends the one picked', async () => {
    const onSelect = jest.fn()
    await renderWithOndai(<SmartReply thread={sampleThread} onSelect={onSelect} showBadge={false} />, { script: replies() })
    await waitFor(() => expect(screen.getByText(sampleReplies[1]!)).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByText(sampleReplies[1]!))
    expect(onSelect).toHaveBeenCalledWith(sampleReplies[1])
  })
  it('takes labels, icons and the reply slot', async () => {
    await renderWithOndai(
      <SmartReply thread={sampleThread} onSelect={() => {}} showBadge={false} icons={{ more: Shuffle }} labels={{ more: 'Again', moreLabel: 'Fresh ones' }} renderReply={({ text, primary }) => <Text>{`${primary ? '*' : ''}${text}`}</Text>} />,
      { script: replies() },
    )
    await waitFor(() => expect(screen.getByText(`*${sampleReplies[0]}`)).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByLabelText('Fresh ones')).toBeTruthy()
  })
  it('puts the first reply in the ghost field and accepts it', async () => {
    const onSelect = jest.fn()
    await renderWithOndai(<SmartReply thread={sampleThread} onSelect={onSelect} presentation="ghost" showBadge={false} labels={{ accept: 'Take it' }} />, { script: replies() })
    await waitFor(() => expect(screen.getByLabelText('Take it')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('Take it'))
    expect(onSelect).toHaveBeenCalledWith(sampleReplies[0])
  })
  it('shows the empty state when nothing comes back', async () => {
    await renderWithOndai(<SmartReply thread={sampleThread} onSelect={() => {}} showBadge={false} renderEmpty={() => <Text>none</Text>} />, { script: () => mockScript.text('') })
    await waitFor(() => expect(screen.getByText('none')).toBeTruthy(), { timeout: 4000 })
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<SmartReply thread={sampleThread} onSelect={() => {}} variant={variant} presentation="stack" showBadge={false} />, { script: replies() })
    await waitFor(() => expect(screen.getByText(sampleReplies[2]!)).toBeTruthy(), { timeout: 4000 })
  })
})
