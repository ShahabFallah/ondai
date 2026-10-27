import { fireEvent, screen, waitFor } from '@testing-library/react-native'
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
})
