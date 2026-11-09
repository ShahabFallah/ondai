import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ScrollText } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { Summarize } from './summarize'
import { sampleThread } from './sample-data'

describe('Summarize', () => {
  it('streams a scripted summary into the card', async () => {
    await renderWithOndai(<Summarize text={sampleThread} length="bullets" showBadge={false} />, { script: mockScript.text('- Venue Friday noon\n- Budget revised') })
    await waitFor(() => expect(screen.getByText(/Venue Friday noon/)).toBeTruthy(), { timeout: 4000 })
  })
  it('shows a calm refusal without a retry button', async () => {
    await renderWithOndai(<Summarize text={sampleThread} showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText(/declined/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it('renders the unavailable state when no model is ready', async () => {
    await renderWithOndai(<Summarize text={sampleThread} showBadge={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/not supported/)).toBeTruthy())
  })
  it('takes labels, icons and the empty and action slots', async () => {
    await renderWithOndai(
      <Summarize
        text={sampleThread}
        autoRun={false}
        showBadge={false}
        icons={{ title: ScrollText }}
        labels={{ title: 'Gist', idle: 'Nothing yet' }}
        renderAction={({ run }) => <Text onPress={run}>go</Text>}
      />,
      { script: mockScript.text('- Venue Friday noon') },
    )
    expect(screen.getByText('Gist')).toBeTruthy()
    expect(screen.getByText('Nothing yet')).toBeTruthy()
    await fireEvent.press(screen.getByText('go'))
    await waitFor(() => expect(screen.getByText(/Venue Friday noon/)).toBeTruthy(), { timeout: 4000 })
  })
  it('lets the app draw bullets and offers copy when done', async () => {
    await renderWithOndai(<Summarize text={sampleThread} showBadge={false} labels={{ copy: 'Copy it' }} renderBullet={({ text, index }) => <Text>{`${index + 1}:${text}`}</Text>} />, {
      script: mockScript.text('- Venue Friday noon\n- Budget revised'),
    })
    await waitFor(() => expect(screen.getByText('2:Budget revised')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByLabelText('Copy it')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<Summarize text={sampleThread} variant={variant} autoRun={false} showBadge={false} />)
    expect(screen.getByText('Summarize')).toBeTruthy()
  })
})
