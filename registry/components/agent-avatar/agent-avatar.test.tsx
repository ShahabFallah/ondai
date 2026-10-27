import { screen } from '@testing-library/react-native'
import { renderWithOndai } from '../test-utils'
import { AgentAvatar } from './agent-avatar'

describe('AgentAvatar', () => {
  it('labels itself as an image with the state', async () => {
    await renderWithOndai(<AgentAvatar state="thinking" testID="avatar" />)
    const el = screen.getByLabelText('Assistant, thinking')
    expect(el.props.accessibilityRole).toBe('image')
  })

  it('uses the plain name while idle', async () => {
    await renderWithOndai(<AgentAvatar state="idle" />)
    expect(screen.getByLabelText('Assistant')).toBeTruthy()
  })

  it('appends sleeping to a custom name (drop, ovals)', async () => {
    await renderWithOndai(<AgentAvatar state="sleeping" name="Nova" shape="drop" eyes="ovals" />)
    expect(screen.getByLabelText('Nova, sleeping')).toBeTruthy()
  })

  it('appends speaking to a custom name (pill, hex colour)', async () => {
    await renderWithOndai(<AgentAvatar state="speaking" name="Nova" shape="pill" color="#8B7CFF" />)
    expect(screen.getByLabelText('Nova, speaking')).toBeTruthy()
  })

  it('accepts rgb colours and the interactive flag off web', async () => {
    await renderWithOndai(<AgentAvatar state="idle" name="Nova" shape="square" color="rgb(200, 210, 220)" interactive />)
    expect(screen.getByLabelText('Nova')).toBeTruthy()
  })

  it('sizes the root to `size`', async () => {
    await renderWithOndai(<AgentAvatar size={40} testID="avatar" />)
    const root = screen.getByTestId('avatar')
    const flat = Object.assign({}, ...[root.props.style].flat(Infinity).filter(Boolean))
    expect(flat.width).toBe(40)
    expect(flat.height).toBe(40)
  })
})
