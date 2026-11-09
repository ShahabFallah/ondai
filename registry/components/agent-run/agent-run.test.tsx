import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { AgentRun } from './agent-run'
import { sampleMeta, sampleTools } from './sample-data'

const meta = { ...sampleMeta, createEvent: { ...sampleMeta.createEvent!, policy: 'auto' as const } }
const script = (call: { callIndex: number }) =>
  call.callIndex === 0 ? mockScript.toolCall('checkCalendar', { day: 'Friday' }) : mockScript.text('Friday at 19:30 works.')

describe('AgentRun', () => {
  it('waits for Run, then shows the steps and the answer', async () => {
    await renderWithOndai(<AgentRun goal="Find a slot" tools={sampleTools} meta={meta} autoRun={false} showBadge={false} labels={{ run: 'Start' }} renderAnswer={(t) => <Text>{`answer:${t}`}</Text>} />, { script })
    await fireEvent.press(screen.getByLabelText('Start'))
    await waitFor(() => expect(screen.getByText('answer:Friday at 19:30 works.')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByText('Checked your Friday evening')).toBeTruthy()
  })
  it('takes an idle slot', async () => {
    await renderWithOndai(<AgentRun goal="Find a slot" tools={sampleTools} meta={meta} autoRun={false} showBadge={false} renderIdle={() => <Text>ready</Text>} />, { script })
    expect(screen.getByText('ready')).toBeTruthy()
  })
  it('takes a step slot', async () => {
    await renderWithOndai(<AgentRun goal="Find a slot" tools={sampleTools} meta={meta} showBadge={false} renderStep={({ step }) => <Text>{`step:${step.toolName}`}</Text>} />, { script })
    await waitFor(() => expect(screen.getByText('step:checkCalendar')).toBeTruthy(), { timeout: 5000 })
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<AgentRun goal="Find a slot" tools={sampleTools} meta={meta} autoRun={false} showBadge={false} variant={variant} />)
    expect(screen.getByLabelText('Run')).toBeTruthy()
  })
})
