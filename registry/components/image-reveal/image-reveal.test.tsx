import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react-native'
import { ThemeProvider } from '@ondai/tokens/react'
import { ImageReveal } from './image-reveal'
import { sampleImage } from './sample-data'

const still = (ui: ReactElement) => render(<ThemeProvider theme="void" motion="off">{ui}</ThemeProvider>)

describe('ImageReveal', () => {
  it('is one image to assistive tech and hides the grain layer', async () => {
    await still(<ImageReveal source={sampleImage} width={160} height={110} progress={0} testID="reveal" accessibilityLabel="Sample" />)
    expect(screen.getByLabelText('Sample').props.accessibilityRole).toBe('image')
    expect(screen.queryByTestId('reveal-overlay')).toBeNull()
    expect(screen.getByTestId('reveal-overlay', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants')
  })

  it('reports revealed once at progress 1', async () => {
    const onRevealed = jest.fn()
    await still(<ImageReveal source={sampleImage} width={160} height={110} progress={1} onRevealed={onRevealed} accessibilityLabel="Sample" />)
    expect(onRevealed).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Sample').props.accessibilityState).toEqual({ busy: false })
  })

  it('counts sampler steps while resolving', async () => {
    await still(<ImageReveal source={sampleImage} width={160} height={110} progress={0.5} steps={20} showSteps />)
    expect(screen.getByText('Step 10 of 20')).toBeTruthy()
  })
})
