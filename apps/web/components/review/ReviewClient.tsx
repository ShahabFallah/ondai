'use client'
import dynamic from 'next/dynamic'

const ReviewGrid = dynamic(() => import('./ReviewGrid'), {
  ssr: false,
  loading: () => <p className="ondai-mono ondai-waiting py-8 text-[color:var(--fg-2)]">Mounting the review grid…</p>,
})

export default function ReviewClient(props: { component?: string; theme?: string; motion?: string; clock?: string }) {
  return <ReviewGrid {...props} />
}
