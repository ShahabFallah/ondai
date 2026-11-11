'use client'
import dynamic from 'next/dynamic'

// The react-native-web tree is client-only.
const FilmScreen = dynamic(() => import('./FilmScreen'), { ssr: false })

export function FilmScreenLoader(props: { name: string; theme: 'paper' | 'void'; state: string }) {
  return <FilmScreen {...props} />
}
