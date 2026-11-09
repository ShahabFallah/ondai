import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { TextSearch } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { CommandBar } from './command-bar'
import { sampleActions } from './sample-data'

describe('CommandBar', () => {
  it('runs the action the model picked and shows its preview', async () => {
    await renderWithOndai(<CommandBar actions={sampleActions} presentation="inline" initialQuery="remind me to buy milk" autoRun showBadge={false} showKeyHints={false} />, {
      script: (call) => (call.callIndex === 0 ? mockScript.toolCall('task_create', { title: 'Buy milk', due: 'tomorrow' }) : mockScript.text('Done.')),
    })
    await waitFor(() => expect(screen.getByText('Buy milk · tomorrow')).toBeTruthy(), { timeout: 5000 })
  })
  it('falls back to keyword search when no model is available', async () => {
    await renderWithOndai(<CommandBar actions={sampleActions} presentation="inline" showBadge={false} showKeyHints={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    const input = screen.getByLabelText('Command input')
    fireEvent.changeText(input, 'open settings')
    await waitFor(() => expect(screen.getByText('Settings')).toBeTruthy())
    fireEvent(input, 'submitEditing')
    await waitFor(() => expect(screen.getByText('Opened Settings')).toBeTruthy(), { timeout: 4000 })
  })
  it('takes labels, icons and render slots', async () => {
    await renderWithOndai(
      <CommandBar
        actions={sampleActions}
        presentation="spotlight"
        inline
        open
        recent={['task.create']}
        showBadge={false}
        showKeyHints={false}
        labels={{ placeholder: 'Type a command', recent: 'Lately', inputLabel: 'Commands' }}
        icons={{ search: TextSearch, voice: null }}
        renderAction={({ action }) => <Text>{`row:${action.title}`}</Text>}
      />,
    )
    expect(screen.getByPlaceholderText('Type a command')).toBeTruthy()
    expect(screen.getByLabelText('Commands')).toBeTruthy()
    expect(screen.getByText('Lately')).toBeTruthy()
    expect(screen.getByText('row:Create task')).toBeTruthy()
  })
  it('shows the empty state when nothing matches', async () => {
    await renderWithOndai(<CommandBar actions={sampleActions} presentation="inline" showBadge={false} showKeyHints={false} renderEmpty={(q) => <Text>{`none:${q}`}</Text>} initialQuery="zzqx" />)
    await waitFor(() => expect(screen.getByText('none:zzqx')).toBeTruthy())
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<CommandBar actions={sampleActions} variant={variant} presentation="spotlight" inline open showBadge={false} showKeyHints={false} />)
    expect(screen.getByLabelText('Command input')).toBeTruthy()
  })
})
