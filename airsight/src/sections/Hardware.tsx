import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { HardwareDiagram } from '@/components/ui/HardwareDiagram'
import { ArchitectureFlow } from '@/components/ui/ArchitectureFlow'
import { PerformancePanel } from '@/components/ui/PerformancePanel'

export function Hardware() {
  return (
    <section id="hardware" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Hardware"
          title="The intelligence behind the system."
          subtitle="Every reading, classification and forecast on this site is produced by this sensor and compute stack running on an Arduino UNO Q."
        />

        <div className="mt-14">
          <HardwareDiagram />
        </div>

        <div className="mt-24">
          <SectionHeading eyebrow="System Architecture" title="From environment to action." align="center" className="mx-auto" />
          <GlassCard className="mt-12 p-8 sm:p-12 overflow-x-auto">
            <ArchitectureFlow />
          </GlassCard>
        </div>

        <div className="mt-12">
          <PerformancePanel />
        </div>
      </div>
    </section>
  )
}
