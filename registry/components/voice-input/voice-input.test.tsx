import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { AudioLines } from 'lucide-react-native'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { VoiceInput } from './voice-input'
import { simulatedRecorder, speechLevel } from './use-voice-input'

describe('VoiceInput', () => {
  it('reaches done with the mock transcript after start and stop', async () => {
    const onTranscript = jest.fn()
    await renderWithOndai(<VoiceInput mode="tap" onTranscript={onTranscript} testID="voice" />, { transcript: 'Call Sam tomorrow at nine.' })
    fireEvent.press(await screen.findByLabelText('Start listening'))
    await waitFor(() => expect(screen.getByLabelText('Stop listening')).toBeTruthy())
    fireEvent.press(screen.getByLabelText('Stop listening'))
    await waitFor(() => expect(screen.getByText('Call Sam tomorrow at nine.')).toBeTruthy(), { timeout: 4000 })
    expect(onTranscript).toHaveBeenCalledWith('Call Sam tomorrow at nine.')
    expect(screen.getByText('Use')).toBeTruthy()
    expect(screen.getByLabelText('Retry')).toBeTruthy()
  })

  it('hands the transcript to onUse and returns to idle', async () => {
    const onUse = jest.fn()
    await renderWithOndai(<VoiceInput mode="tap" onUse={onUse} />, { transcript: 'Add milk to the list.' })
    fireEvent.press(await screen.findByLabelText('Start listening'))
    await waitFor(() => expect(screen.getByLabelText('Stop listening')).toBeTruthy())
    fireEvent.press(screen.getByLabelText('Stop listening'))
    await waitFor(() => expect(screen.getByText('Use')).toBeTruthy(), { timeout: 4000 })
    fireEvent.press(screen.getByText('Use'))
    expect(onUse).toHaveBeenCalledWith('Add milk to the list.')
    await waitFor(() => expect(screen.getByText('Tap to talk')).toBeTruthy())
  })

  it('shows the unavailable state when no transcription provider is ready', async () => {
    await renderWithOndai(<VoiceInput presentation="card" />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/isn’t available/)).toBeTruthy())
    expect(screen.getByLabelText('Voice input unavailable')).toBeTruthy()
  })

  it('simulated recorder emits speech-like levels between 0 and 1', async () => {
    const rec = simulatedRecorder({ intervalMs: 5, seed: 3 })
    const seen: number[] = []
    const off = rec.onLevel!((l) => seen.push(l))
    await rec.start()
    await new Promise((r) => setTimeout(r, 60))
    const audio = await rec.stop()
    off()
    expect(seen.length).toBeGreaterThan(3)
    expect(seen.every((l) => l >= 0 && l <= 1)).toBe(true)
    expect(audio).toBeInstanceOf(Uint8Array)
    expect(speechLevel(0)).toBeGreaterThan(0)
    expect(speechLevel(1234, 2)).toBeLessThanOrEqual(1)
  })

  it('takes labels, icons and slots', async () => {
    const onUse = jest.fn()
    await renderWithOndai(
      <VoiceInput
        mode="tap"
        onUse={onUse}
        icons={{ mic: AudioLines, retry: null }}
        labels={{ tapHint: 'Tocca per parlare', start: 'Inizia', stop: 'Ferma', use: 'Usa' }}
        renderTranscript={(text) => <Text>{`heard:${text}`}</Text>}
      />,
      { transcript: 'Buy oat milk.' },
    )
    expect(screen.getByText('Tocca per parlare')).toBeTruthy()
    fireEvent.press(await screen.findByLabelText('Inizia'))
    await waitFor(() => expect(screen.getByLabelText('Ferma')).toBeTruthy())
    fireEvent.press(screen.getByLabelText('Ferma'))
    await waitFor(() => expect(screen.getByText('heard:Buy oat milk.')).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByLabelText('Retry')).toBeNull()
    fireEvent.press(screen.getByText('Usa'))
    expect(onUse).toHaveBeenCalledWith('Buy oat milk.')
  })

  it('lets the app draw the mic key', async () => {
    await renderWithOndai(<VoiceInput renderMic={({ listening }) => <Text>{listening ? 'live' : 'mic'}</Text>} />)
    expect(screen.getByText('mic')).toBeTruthy()
  })

  it.each(skinNames)('renders the %s variant in both presentations', async (variant) => {
    await renderWithOndai(
      <>
        <VoiceInput variant={variant} mode="tap" />
        <VoiceInput variant={variant} presentation="card" mode="tap" tint="#FF5A5F" size="lg" />
      </>,
    )
    expect(screen.getAllByLabelText('Start listening')).toHaveLength(2)
  })
})
