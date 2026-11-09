import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Scissors } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { skinNames } from '@ondai/tokens'
import { renderWithOndai } from '../test-utils'
import { Rewrite } from './rewrite'
import { sampleDraft, sampleShorter } from './sample-data'

describe('Rewrite', () => {
  it('rewrites and hands the accepted text back', async () => {
    const onAccept = jest.fn()
    await renderWithOndai(<Rewrite value={sampleDraft} onAccept={onAccept} showBadge={false} />, { script: mockScript.text(sampleShorter) })
    await fireEvent.press(screen.getByText('Shorten'))
    await waitFor(() => expect(screen.getByText('Use this')).toBeTruthy(), { timeout: 4000 })
    await fireEvent.press(screen.getByText('Use this'))
    expect(onAccept).toHaveBeenCalledWith(sampleShorter)
  })
  it('takes labels, icons and the mode and actions slots', async () => {
    await renderWithOndai(
      <Rewrite
        value={sampleDraft}
        onAccept={() => {}}
        showBadge={false}
        icons={{ shorten: Scissors }}
        labels={{ shorten: 'Trim' }}
        renderMode={({ label, onPress }) => <Text onPress={onPress}>{`mode:${label}`}</Text>}
        renderActions={({ done }) => (done ? <Text>finished</Text> : null)}
      />,
      { script: mockScript.text(sampleShorter) },
    )
    await fireEvent.press(screen.getByText('mode:Trim'))
    await waitFor(() => expect(screen.getByText('finished')).toBeTruthy(), { timeout: 4000 })
  })
  it('shows the empty line while there is nothing to rewrite', async () => {
    await renderWithOndai(<Rewrite value="" onAccept={() => {}} labels={{ empty: 'Type first' }} />)
    expect(screen.getByText('Type first')).toBeTruthy()
  })
  it.each(skinNames)('renders the %s variant', async (variant) => {
    await renderWithOndai(<Rewrite value={sampleDraft} onAccept={() => {}} variant={variant} presentation="chips" />)
    expect(screen.getByText('Formal')).toBeTruthy()
  })
})
