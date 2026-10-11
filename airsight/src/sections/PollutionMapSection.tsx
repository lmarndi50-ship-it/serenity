import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { PollutionMap } from '@/components/ui/PollutionMap'
import { NetworkTopology } from '@/components/ui/NetworkTopology'
import { SimulatedBadge } from '@/components/ui/SimulatedBadge'

const STATS = [
  { label: 'Active Nodes', value: '5' },
  { label: 'Cloud AI Dependency', value: '0' },
  { label: 'Local Inference', value: '100%' },
]

export function PollutionMapSection() {
  return (
    <section id="map" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <SectionHeading
            eyebrow="Hyperlocal Pollution Map"
            title="Pollution doesn't stop at city boundaries."
            subtitle="Five Edge AI nodes across campus each classify pollution independently — the map only shares their summarized findings."
            className="mb-0"
          />
          <SimulatedBadge />
        </div>

        <div className="mt-14">
          <PollutionMap />
        </div>

        <div className="mt-20 text-center">
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-8">Multi-Node Network</h3>
          <NetworkTopology />
          <div className="mt-10 flex flex-wrap justify-center gap-8">
            {STATS.map((stat) => (
              <GlassCard key={stat.label} className="px-6 py-4 text-center min-w-[140px]">
                <div className="font-data text-2xl font-bold text-[var(--color-accent-emerald)]">{stat.value}</div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mt-1">
                  {stat.label}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
