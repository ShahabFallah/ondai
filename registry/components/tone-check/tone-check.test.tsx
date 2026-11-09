import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Wand2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { ToneCheck } from './tone-check'
import { normalizeFormality, parseToneLines, toTone } from './prompts'
import { sampleBlunt, sampleBluntReading, sampleFriendly, sampleFriendlyReading, sampleSofter } from './sample-data'

const script = (reading: object, softer = sampleSofter) => (call: { system?: string }) => (/rewrite the message/i.test(call.system ?? '') ? mockScript.text(softer) : mockScript.object(reading))

describe('tone prompts', () => {
  it('parses the line fallback', () => {
    expect(parseToneLines('tone: Blunt\nformality: 0.4\nnote: "May read as impatient."')).toEqual({ tone: 'blunt', formality: 0.4, note: 'May read as impatient' })
  })
  it('maps near-miss tone words and scales formality', () => {
    expect(toTone('Passive-aggressive')).toBe('tense')
    expect(toTone('warm')).toBe('friendly')
    expect(toTone('matter of fact')).toBe('neutral')
    expect(normalizeFormality(70)).toBe(0.7)
    expect(normalizeFormality(7)).toBe(0.7)
    expect(normalizeFormality(-2)).toBe(0)
  })
})

describe('ToneCheck', () => {
  it('reads a friendly draft without offering a rewrite', async () => {
    await renderWithOndai(<ToneCheck value={sampleFriendly} showBadge={false} />, { script: script(sampleFriendlyReading) })
    await waitFor(() => expect(screen.getByText('Friendly')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText(sampleFriendlyReading.note)).toBeTruthy()
    expect(screen.queryByText('Use softer')).toBeNull()
  })
  it('offers a softer version of a blunt draft and hands it back', async () => {
    const onAccept = jest.fn()
    await renderWithOndai(<ToneCheck value={sampleBlunt} onAccept={onAccept} showBadge={false} />, { script: script(sampleBluntReading) })
    await waitFor(() => expect(screen.getByText('Use softer')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('Blunt')).toBeTruthy()
    await fireEvent.press(screen.getByText('Use softer'))
    expect(onAccept).toHaveBeenCalledWith(sampleSofter)
  })
  it('waits for the Soften key with suggest="tap"', async () => {
    const onAccept = jest.fn()
    await renderWithOndai(<ToneCheck value={sampleBlunt} onAccept={onAccept} suggest="tap" showBadge={false} icons={{ soften: Wand2 }} labels={{ soften: 'Gentler' }} />, { script: script(sampleBluntReading) })
    await waitFor(() => expect(screen.getByText('Gentler')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByText('Gentler'))
    await waitFor(() => expect(screen.getByText('Use softer')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByText('Keep mine'))
    expect(screen.queryByText('Use softer')).toBeNull()
    expect(onAccept).not.toHaveBeenCalled()
  })
  it('takes labels and the meter and suggestion slots', async () => {
    await renderWithOndai(
      <ToneCheck
        value={sampleBlunt}
        showBadge={false}
        labels={{ blunt: 'Brusco' }}
        renderMeter={({ reading }) => <Text>{`meter:${reading?.tone ?? 'none'}`}</Text>}
        renderSuggestion={({ suggestion, streaming }) => (streaming ? null : <Text>{`softer:${suggestion}`}</Text>)}
      />,
      { script: script(sampleBluntReading) },
    )
    await waitFor(() => expect(screen.getByText(`softer:${sampleSofter}`)).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText('Brusco')).toBeTruthy()
    expect(screen.getByText('meter:blunt')).toBeTruthy()
  })
  it('shows the idle line before there is enough text', async () => {
    await renderWithOndai(<ToneCheck value="" labels={{ idle: 'Type first' }} />)
    expect(screen.getByText('Type first')).toBeTruthy()
  })
  it('shows the error and a retry key', async () => {
    await renderWithOndai(<ToneCheck value={sampleBlunt} showBadge={false} />, { script: mockScript.error('unknown') })
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy(), { timeout: 4000 })
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<ToneCheck value={sampleBlunt} variant={variant} presentation={variant === 'glass' ? 'pill' : 'card'} showBadge={false} />, { script: script(sampleBluntReading) })
    await waitFor(() => expect(screen.getByText('Blunt')).toBeTruthy(), { timeout: 4000 })
  })
})
