import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Globe } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { Translate } from './translate'
import { sampleMessage, sampleTranslations } from './sample-data'

describe('Translate', () => {
  it('streams a scripted translation into the card', async () => {
    await renderWithOndai(<Translate text={sampleMessage} to="it" showBadge={false} />, { script: mockScript.text(sampleTranslations.it!) })
    await waitFor(() => expect(screen.getByText(/dieci minuti/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByLabelText('Copy')).toBeTruthy()
  })
  it('translates again when another language is picked', async () => {
    const onChangeTarget = jest.fn()
    await renderWithOndai(<Translate text={sampleMessage} to="it" showBadge={false} onChangeTarget={onChangeTarget} />, {
      script: (call) => mockScript.text(call.system?.includes('into German') ? sampleTranslations.de! : sampleTranslations.it!),
    })
    await waitFor(() => expect(screen.getByText(/dieci minuti/)).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByText('Deutsch'))
    expect(onChangeTarget).toHaveBeenCalledWith('de')
    await waitFor(() => expect(screen.getByText(/zehn Minuten/)).toBeTruthy(), { timeout: 4000 })
  })
  it('swaps the pair without another model call', async () => {
    const onSwap = jest.fn()
    await renderWithOndai(<Translate text={sampleMessage} to="it" showBadge={false} onSwap={onSwap} />, { script: mockScript.text(sampleTranslations.it!) })
    await waitFor(() => expect(screen.getByLabelText('Swap languages')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('Swap languages'))
    expect(onSwap).toHaveBeenCalledWith({ text: sampleTranslations.it, from: 'it', to: 'en' })
    expect(screen.getByText(sampleMessage)).toBeTruthy()
  })
  it('shows a calm refusal without a retry button', async () => {
    await renderWithOndai(<Translate text={sampleMessage} showBadge={false} />, { script: mockScript.refusal() })
    await waitFor(() => expect(screen.getByText(/declined/)).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText('Try again')).toBeNull()
  })
  it('renders the unavailable state when no model is ready', async () => {
    await renderWithOndai(<Translate text={sampleMessage} showBadge={false} />, { availability: { status: 'unavailable', reason: 'device-not-eligible' } })
    await waitFor(() => expect(screen.getByText(/not supported/)).toBeTruthy())
  })
  it('takes labels, icons and the language and empty slots', async () => {
    await renderWithOndai(
      <Translate
        text={sampleMessage}
        autoRun={false}
        showBadge={false}
        icons={{ title: Globe }}
        labels={{ idle: 'Nothing yet' }}
        renderLanguage={({ language, onPress }) => <Text onPress={onPress}>{`lang:${language.code}`}</Text>}
      />,
      { script: mockScript.text(sampleTranslations.fr!) },
    )
    expect(screen.getByText('Nothing yet')).toBeTruthy()
    expect(screen.queryByText('lang:en')).toBeNull()
    await fireEvent.press(screen.getByText('lang:fr'))
    await waitFor(() => expect(screen.getByText(/dix minutes/)).toBeTruthy(), { timeout: 4000 })
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<Translate text={sampleMessage} variant={variant} autoRun={false} showBadge={false} />)
    expect(screen.getByText('Translate')).toBeTruthy()
    expect(screen.getByText('日本語')).toBeTruthy()
  })
})
