'use client'
import dynamic from 'next/dynamic'

const ReviewGrid = dynamic(() => import('./ReviewGrid'), { ssr: false, loading: () => <p className="p-8 ondai-mono ondai-waiting text-[color:var(--ondai-text-tertiary)]">mounting review grid…</p> })

export default function ReviewClient(props: { component?: string; theme?: string; motion?: string; clock?: string }) {
  return <ReviewGrid {...props} />
}
