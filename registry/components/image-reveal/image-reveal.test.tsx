import type { ReactElement } from 'react'
import { act, render, screen } from '@testing-library/react-native'
import { ThemeProvider } from '@ondai/tokens/react'
import { ImageReveal } from './image-reveal'
import { sampleImage } from './sample-data'

/** 140×70 at cell 14 → a 10×5 grid. */
const size = { width: 140, height: 70, cell: 14 } as const
const still = (ui: ReactElement) => render(<ThemeProvider theme="void" motion="off">{ui}</ThemeProvider>)

interface Node {
  type: string
  props: Record<string, unknown>
  children?: Array<Node | string> | null
}
/** Every host node of a given type in the rendered tree (react-native-svg mounts `RNSVGRect`, `RNSVGText`, ...). */
function nodes(type: string): Node[] {
  const out: Node[] = []
  const walk = (n: Node | string | null | undefined) => {
    if (!n || typeof n === 'string') return
    if (n.type === type) out.push(n)
    for (const c of n.children ?? []) walk(c)
  }
  const json = screen.toJSON() as unknown as Node | Node[] | null
  for (const n of Array.isArray(json) ? json : [json]) walk(n)
  return out
}
const rects = () => nodes('RNSVGRect')
const fills = () => rects().map((r) => r.props.fill)

describe('ImageReveal', () => {
  it('covers every cell at progress 0 and hides the overlay from assistive tech', async () => {
    await still(<ImageReveal source={sampleImage} {...size} progress={0} testID="reveal" accessibilityLabel="Sample" />)
    expect(rects()).toHaveLength(50)
    expect(screen.getByLabelText('Sample').props.accessibilityRole).toBe('image')
    // Hidden from assistive tech, so RNTL only finds it when asked to include hidden elements.
    expect(screen.queryByTestId('reveal-overlay')).toBeNull()
    expect(screen.getByTestId('reveal-overlay', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants')
  })

  it('has no opaque cells at progress 1 and reports revealed once', async () => {
    const onRevealed = jest.fn()
    await still(<ImageReveal source={sampleImage} {...size} progress={1} onRevealed={onRevealed} />)
    expect(rects()).toHaveLength(0)
    expect(onRevealed).toHaveBeenCalledTimes(1)
  })

  it('reveals a centre-biased random subset in between', async () => {
    await still(<ImageReveal source={sampleImage} {...size} progress={0.5} />)
    const n = rects().length
    expect(n).toBeGreaterThan(10)
    expect(n).toBeLessThan(40)
  })

  it('ascii mode draws glyph rows over black runs', async () => {
    await still(<ImageReveal source={sampleImage} {...size} mode="ascii" progress={0} />)
    expect(nodes('RNSVGText').length).toBeGreaterThanOrEqual(5)
    // One merged run per row, every run in the same (background) colour; react-native-svg has already processed the fill.
    const r = rects()
    expect(r).toHaveLength(5)
    expect(new Set(r.map((x) => JSON.stringify(x.props.fill))).size).toBe(1)
    expect(r[0]!.props.fill).toBeDefined()
  })

  it('renders a still frame for auto when motion is off', async () => {
    await still(<ImageReveal source={sampleImage} {...size} progress="auto" />)
    const n = rects().length
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(50)
  })

  it('churns on a timer when motion is on', async () => {
    jest.useFakeTimers()
    try {
      await render(
        <ThemeProvider theme="void">
          <ImageReveal source={sampleImage} {...size} progress={0.3} />
        </ThemeProvider>,
      )
      const before = fills()
      await act(async () => {
        jest.advanceTimersByTime(350)
      })
      const after = fills()
      expect(after).toHaveLength(before.length)
      expect(after).not.toEqual(before)
    } finally {
      jest.useRealTimers()
    }
  })
})
