import { boolean, definePlayground, number, select } from '@ondai/playground'
import { IonBorderDemo } from './ion-border.demo'

export default definePlayground({
  name: 'ion-border',
  title: 'IonBorder',
  category: 'primitive',
  description: 'The signature thinking border: a slow gradient light, a bright comet, or a breathing ring around any container while the AI works.',
  component: IonBorderDemo,
  controls: {
    variant: select(['sweep', 'beam', 'pulse'], 'sweep', 'Variant'),
    radius: select(['sm', 'md', 'lg', 'xl', 'pill'], 'lg', 'Radius'),
    width: number(1.5, { min: 1, max: 4, step: 0.5, label: 'Ring width' }),
    glow: boolean(true, 'Glow'),
    focused: boolean(false, 'Focused'),
    label: select(['short', 'long'], 'short', 'Content'),
  },
  variantKeys: ['variant', 'radius'],
  states: {
    idle: { props: { active: false }, description: 'Monochrome, hairline border.' },
    focus: { props: { active: false, focused: true }, description: 'Faint accent ring.' },
    thinking: { props: { active: true }, description: 'The ion sweep (≈2.4s per lap).' },
    beam: { props: { active: true, variant: 'beam' }, description: 'A bright comet with a long fading tail and an outer halo.' },
    pulse: { props: { active: true, variant: 'pulse' }, description: 'No travelling light: the whole ring breathes (1.6s).' },
    done: { props: { active: false }, description: 'Light fades out within 300ms.' },
  },
  review: ['idle', 'focus', 'thinking'],
  frame: { width: 360, padding: 24, background: 'bg' },
})
