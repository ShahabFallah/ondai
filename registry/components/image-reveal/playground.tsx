import { boolean, definePlayground, number, select } from '@ondai/playground'
import { ImageReveal } from './image-reveal'
import { sampleImage } from './sample-data'

export default definePlayground({
  name: 'image-reveal',
  title: 'ImageReveal',
  category: 'primitive',
  description: 'An image that resolves out of a churning mosaic or an ASCII field as progress rises. Drive `progress` from your pipeline or let it loop.',
  component: ImageReveal,
  controls: {
    mode: select(['mosaic', 'ascii'], 'mosaic', 'Mode'),
    cell: number(14, { min: 8, max: 28, step: 2, label: 'Cell' }),
    progress: number(0.5, { min: 0, max: 1, step: 0.05, label: 'Progress' }),
    tint: boolean(true, 'Tint'),
    radius: select(['sm', 'md', 'lg', 'xl'], 'lg', 'Radius'),
  },
  variantKeys: ['mode'],
  states: {
    revealing: { props: { progress: 'auto' }, freezeAt: 1200, description: 'Loops: reveal over 2.4 s, hold 1.6 s, dissolve back in 0.8 s.' },
    half: { props: { progress: 0.5 } },
    done: { props: { progress: 1 } },
    ascii: { props: { mode: 'ascii', progress: 0.4 } },
  },
  review: ['half', 'ascii'],
  frame: { width: 360, padding: 20, background: 'bg' },
  render: (p) => <ImageReveal {...(p as object)} source={sampleImage} width={320} height={220} accessibilityLabel="A chrome sphere and ring in cool light" />,
  code: (p) => {
    const attrs = [`source={{ uri }}`, `width={320}`, `height={220}`]
    if (p.mode !== 'mosaic') attrs.push(`mode="${p.mode}"`)
    attrs.push(typeof p.progress === 'number' ? `progress={${p.progress}}` : `progress="auto"`)
    if (p.cell !== 14) attrs.push(`cell={${p.cell}}`)
    if (!p.tint) attrs.push(`tint={false}`)
    if (p.radius !== 'lg') attrs.push(`radius="${p.radius}"`)
    return `<ImageReveal\n  ${attrs.join('\n  ')}\n/>`
  },
})
