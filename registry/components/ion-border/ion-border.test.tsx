import { act, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { renderWithOndai } from '../test-utils'
import { IonBorder } from './ion-border'

/** The light layers mount once the clip box knows its size. */
async function layOut(testID: string) {
  const clip = screen.getByTestId(testID)
  await act(async () => {
    clip.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 80 } } })
  })
}

describe('IonBorder', () => {
  it('beam renders the comet ring and its outer halo once laid out', async () => {
    await renderWithOndai(
      <IonBorder active variant="beam" testID="ib">
        <Text>Summarizing</Text>
      </IonBorder>,
    )
    expect(screen.queryByTestId('ib-beam')).toBeNull()
    await layOut('ib-clip')
    expect(screen.getByTestId('ib-beam')).toBeTruthy()
    expect(screen.getByTestId('ib-halo')).toBeTruthy()
    expect(screen.queryByTestId('ib-sweep')).toBeNull()
    expect(screen.getByText('Summarizing')).toBeTruthy()
  })
  it('pulse breathes the whole ring with no travelling light', async () => {
    await renderWithOndai(
      <IonBorder active variant="pulse" testID="ib">
        <Text>Summarizing</Text>
      </IonBorder>,
    )
    await layOut('ib-clip')
    expect(screen.getByTestId('ib-pulse')).toBeTruthy()
    expect(screen.getByTestId('ib-halo')).toBeTruthy()
    expect(screen.queryByTestId('ib-beam')).toBeNull()
  })
  it('sweep stays the default and draws no halo', async () => {
    await renderWithOndai(
      <IonBorder active testID="ib">
        <Text>Summarizing</Text>
      </IonBorder>,
    )
    await layOut('ib-clip')
    expect(screen.getByTestId('ib-sweep')).toBeTruthy()
    expect(screen.queryByTestId('ib-halo')).toBeNull()
  })
})
