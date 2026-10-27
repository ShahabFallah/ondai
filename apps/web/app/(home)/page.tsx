import { Hero } from '@/components/home/Hero'
import { HowItRuns } from '@/components/home/HowItRuns'
import { Primitives } from '@/components/home/Primitives'
import { RunsOn } from '@/components/home/RunsOn'
import { Showcase } from '@/components/home/Showcase'
import '@/components/home/home.css'

export default function HomePage() {
  return (
    <main className="home relative">
      <Hero />
      <Showcase />
      <Primitives />
      <HowItRuns />
      <RunsOn />
    </main>
  )
}
