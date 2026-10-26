import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { mockScript } from '@ondai/core/mock'
import { renderWithOndai } from '../test-utils'
import { CommandBar } from './command-bar'
import { sampleActions } from './sample-data'

describe('CommandBar', () => {
  it('runs the action the model picked and shows its preview', async () => {
    renderWithOndai(<CommandBar actions={sampleActions} presentation="inline" initialQuery="remind me to buy milk" autoRun showBadge={false} showKeyHints={false} />, {
      script: (call) => (call.callIndex === 0 ? mockScript.toolCall('task_create', { title: 'Buy milk', due: 'tomorrow' }) : mockScript.text('Done.')),
    })
    await waitFor(() => expect(screen.getByText('Create task · Buy milk · tomorrow')).toBeTruthy(), { timeout: 5000 })
  })
  it('falls back to keyword search when no model is available', async () => {
    renderWithOndai(<CommandBar actions={sampleActions} presentation="inline" showBadge={false} showKeyHints={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    const input = screen.getByLabelText('Command input')
    fireEvent.changeText(input, 'open settings')
    await waitFor(() => expect(screen.getByText('Settings')).toBeTruthy())
    fireEvent(input, 'submitEditing')
    await waitFor(() => expect(screen.getByText('Opened Settings')).toBeTruthy(), { timeout: 4000 })
  })
})
