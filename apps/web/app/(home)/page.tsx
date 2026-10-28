import { Hero } from '@/components/home/Hero'
import { ClosingCta } from '@/components/home/ClosingCta'
import { HowItRuns } from '@/components/home/HowItRuns'
import { Library } from '@/components/home/Library'
import { Primitives } from '@/components/home/Primitives'
import { Showcase } from '@/components/home/Showcase'
import '@/components/home/home.css'
import '@/components/home/sections.css'

export default function HomePage() {
  return (
    <main className="home relative">
      <Hero />
      <Showcase />
      <Primitives />
      <HowItRuns />
      <Library />
      <ClosingCta />
    </main>
  )
}
