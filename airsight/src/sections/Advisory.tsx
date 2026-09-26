import { SectionHeading } from '@/components/ui/SectionHeading'
import { AdvisoryCard } from '@/components/ui/AdvisoryCard'
import { useAirSight } from '@/hooks/useAirSightState'
import { buildAdvisories } from '@/data/advisories'

export function Advisory() {
  const { scenario, sourceInference, current } = useAirSight()
  const advisories = buildAdvisories(scenario, sourceInference.source.id, current)

  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Actionable AI Advisory"
          title="So what should you do?"
          subtitle="Instead of just showing a number, AIRSIGHT turns the current sensor signature into a concrete, contextual recommendation."
        />

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {advisories.map((advisory, i) => (
            <AdvisoryCard key={advisory.id} advisory={advisory} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  )
}
