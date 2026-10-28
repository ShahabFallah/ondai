import type { Availability, Locality, ProviderId, UnavailableReason } from './types'

export interface AvailabilityCopy {
  title: string
  description: string
  /** Deep link or docs anchor for "Learn how to enable". */
  learnMore?: string
  canRetry: boolean
}

const reasons: Record<UnavailableReason, AvailabilityCopy> = {
  'device-not-eligible': {
    title: 'On-device AI is not supported here',
    description: 'This device does not include an on-device model. Everything else works as usual.',
    learnMore: 'https://ondai.dev/docs/device-support',
    canRetry: false,
  },
  'not-enabled': {
    title: 'Turn on Apple Intelligence',
    description: 'On-device AI is available once Apple Intelligence is enabled in Settings.',
    learnMore: 'app-settings:',
    canRetry: true,
  },
  'model-downloading': {
    title: 'Model is getting ready',
    description: 'The on-device model is still downloading. This usually takes a few minutes on Wi-Fi.',
    canRetry: true,
  },
  'unsupported-os': {
    title: 'Update required',
    description: 'On-device AI needs iOS 26 or Android 14 with AICore.',
    learnMore: 'https://ondai.dev/docs/device-support',
    canRetry: false,
  },
  'unsupported-language': {
    title: 'Language not supported yet',
    description: 'The on-device model does not support this language. Try English for now.',
    canRetry: false,
  },
  'background-blocked': {
    title: 'Bring the app to the front',
    description: 'On-device AI only runs while the app is in the foreground.',
    canRetry: true,
  },
  quota: {
    title: 'Taking a short break',
    description: 'The on-device model hit its usage limit. Try again in a little while.',
    canRetry: true,
  },
  'no-provider': {
    title: 'No on-device model configured',
    description: 'Add a provider to createOndai() to enable AI features.',
    learnMore: 'https://ondai.dev/docs/core',
    canRetry: false,
  },
  unknown: {
    title: 'On-device AI is unavailable',
    description: 'Apple Intelligence may be off, not eligible on this device, or still downloading.',
    learnMore: 'https://ondai.dev/docs/device-support',
    canRetry: true,
  },
}

export function availabilityCopy(av: Availability | undefined): AvailabilityCopy {
  if (!av) return { title: 'Checking on-device AI…', description: '', canRetry: false }
  if (av.status === 'ready') return { title: 'Ready', description: '', canRetry: false }
  if (av.status === 'preparing') return reasons['model-downloading']
  return reasons[av.reason]
}

/** Badge label: `On device · Apple`, `Local · Llama`, `Cloud`, `Simulated · Apple`. */
export function badgeLabel(provider: ProviderId | undefined, locality: Locality | undefined, label?: string): string {
  const raw = label ?? provider ?? ''
  const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : ''
  switch (locality) {
    case 'on-device':
      return name ? `On device · ${name}` : 'On device'
    case 'local':
      return name ? `Local · ${name}` : 'Local'
    case 'cloud':
      return 'Cloud'
    case 'simulated':
      return name ? `Simulated · ${name}` : 'Simulated'
    default:
      return 'On device'
  }
}
