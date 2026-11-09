import { boolean, definePlayground, number, select } from '@ondai/playground'
import { ImageReveal } from './image-reveal'
import { sampleImage } from './sample-data'

export default definePlayground({
  name: 'image-reveal',
  title: 'ImageReveal',
  category: 'primitive',
  description: 'An image arriving the way a diffusion model makes it: grain over a blurred field, resolved step by step. Drive `progress` from your pipeline or let it loop.',
  component: ImageReveal,
  controls: {
    progress: number(0.5, { min: 0, max: 1, step: 0.05, label: 'Progress' }),
    steps: number(28, { min: 8, max: 50, step: 1, label: 'Steps' }),
    showSteps: boolean(true, 'Step counter'),
    radius: select(['sm', 'md', 'lg', 'xl'], 'lg', 'Radius'),
  },
  variantKeys: [],
  states: {
    revealing: { props: { progress: 'auto' }, freezeAt: 1600, description: 'Loops: resolve over 3.6 s, hold 2.4 s, back to noise in 0.9 s.' },
    early: { props: { progress: 0.2 } },
    half: { props: { progress: 0.55 } },
    done: { props: { progress: 1 } },
  },
  review: ['early', 'half', 'done'],
  frame: { width: 360, padding: 20, background: 'bg' },
  render: (p) => <ImageReveal {...(p as object)} source={sampleImage} width={320} height={220} accessibilityLabel="A dusk over layered hills" />,
  code: (p) => {
    const attrs = [`source={{ uri }}`, `width={320}`, `height={220}`]
    attrs.push(typeof p.progress === 'number' ? `progress={${p.progress}}` : `progress="auto"`)
    if (p.steps !== 28) attrs.push(`steps={${p.steps}}`)
    if (p.showSteps) attrs.push('showSteps')
    if (p.radius !== 'lg') attrs.push(`radius="${p.radius}"`)
    return `<ImageReveal\n  ${attrs.join('\n  ')}\n/>`
  },
})
