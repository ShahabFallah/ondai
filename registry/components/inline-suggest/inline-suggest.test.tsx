import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { InlineSuggest, joinSuggestion } from './inline-suggest'

describe('joinSuggestion', () => {
  it('adds one space between words', () => {
    expect(joinSuggestion('move dinner to', 'Saturday instead')).toBe(' Saturday instead')
  })
  it('keeps punctuation tight', () => {
    expect(joinSuggestion('see you then', '? Thanks')).toBe('? Thanks')
  })
  it('does not double a trailing space and strips quotes', () => {
    expect(joinSuggestion('move it to ', '“Saturday”')).toBe('Saturday')
  })
  it('drops an empty guess', () => {
    expect(joinSuggestion('hello', '   ')).toBe('')
  })
})

describe('InlineSuggest', () => {
  it('offers the rest of the sentence and takes it with the accept key', async () => {
    const onAccept = jest.fn()
    await renderWithOndai(<InlineSuggest defaultValue="can we move dinner to" debounceMs={0} onAccept={onAccept} showBadge={false} labels={{ accept: 'Take' }} />, { script: mockScript.text('Saturday') })
    await waitFor(() => expect(screen.getByLabelText('Take: Saturday')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByLabelText('Take: Saturday'))
    expect(onAccept).toHaveBeenCalledWith(' Saturday')
    expect(screen.getByDisplayValue('can we move dinner to Saturday')).toBeTruthy()
  })
  it('takes a placeholder label and an accept slot', async () => {
    await renderWithOndai(<InlineSuggest labels={{ placeholder: 'Scrivi' }} renderAccept={({ suggestion }) => <Text>{suggestion ? 'ready' : 'waiting'}</Text>} />)
    expect(screen.getByPlaceholderText('Scrivi')).toBeTruthy()
    expect(screen.getByText('waiting')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<InlineSuggest variant={variant} size="lg" tint="#3B82F6" showBadge={false} />)
    expect(screen.getByLabelText('Add')).toBeTruthy()
  })
})
