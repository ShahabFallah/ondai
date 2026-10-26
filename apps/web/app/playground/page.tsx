import { redirect } from 'next/navigation'
import { manifest } from '@ondai/registry/manifest'

export default function PlaygroundIndex() {
  const first = manifest.find((m) => m.hasPlayground)
  redirect(first ? `/playground/${first.name}` : '/')
}
