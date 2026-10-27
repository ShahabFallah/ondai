import { screen } from '@testing-library/react-native'
import { renderWithOndai } from '../test-utils'
import { ThinkingIndicator } from './thinking-indicator'

describe('ThinkingIndicator', () => {
  it('announces the state when there is no label', async () => {
    await renderWithOndai(<ThinkingIndicator variant="orb" state="listening" testID="ti" />)
    expect(screen.getByLabelText('Listening')).toBeTruthy()
    expect(screen.getByTestId('ti-orb')).toBeTruthy()
  })
  it('keeps an explicit label and the progressbar role', async () => {
    await renderWithOndai(<ThinkingIndicator variant="orb" size="sm" state="speaking" label="Speaking" />)
    expect(screen.getByLabelText('Speaking').props.accessibilityRole).toBe('progressbar')
    expect(screen.getByText('Speaking')).toBeTruthy()
  })
  it('defaults to thinking', async () => {
    await renderWithOndai(<ThinkingIndicator />)
    expect(screen.getByLabelText('Thinking')).toBeTruthy()
  })
})
