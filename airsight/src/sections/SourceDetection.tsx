import { TrendingUp, TrendingDown } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { SensorFusionDiagram } from '@/components/ui/SensorFusionDiagram'
import { SimulatedBadge } from '@/components/ui/SimulatedBadge'
import { useAirSight } from '@/hooks/useAirSightState'
import { BASELINE } from '@/data/scenarios'

const KEY_LABEL: Record<string, string> = { pm25: 'PM2.5', pm10: 'PM10', co: 'CO', no2: 'NO₂', voc: 'VOC' }

export function SourceDetection() {
  const { sourceInference, current } = useAirSight()
  const { source, confidence, ranked } = sourceInference

  return (
    <section id="insights" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="AI Pollution Source Detection"
          title="Where is the pollution coming from?"
          subtitle="Sensor fusion combines every reading on the node into a single probable-source classification, run entirely on-device."
        />

        <div className="mt-14 grid lg:grid-cols-2 gap-8 items-start">
          <GlassCard className="p-8" glow="emerald">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
                Probable Source
              </span>
              <SimulatedBadge />
            </div>

            <div className="text-4xl sm:text-5xl font-semibold text-[var(--color-accent-emerald)] tracking-tight mb-6">
              {source.label}
            </div>

            <div className="mb-8">
              <ConfidenceBar value={confidence} label="Confidence" highlight />
            </div>

            <div className="mb-2 text-xs tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">
              Detected signature
            </div>
            <div className="flex flex-wrap gap-3">
              {source.pollutants.length === 0 && (
                <span className="text-sm text-[var(--color-text-secondary)]">No elevated signature detected</span>
              )}
              {source.pollutants.map((p) => {
                const up = current[p.key] >= BASELINE[p.key]
                return (
                  <span
                    key={p.key}
                    className="inline-flex items-center gap-1.5 text-sm font-data px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                  >
                    {KEY_LABEL[p.key] ?? p.key}
                    {up ? (
                      <TrendingUp size={13} className="text-[var(--color-danger)]" />
                    ) : (
                      <TrendingDown size={13} className="text-[var(--color-accent-emerald)]" />
                    )}
                  </span>
                )
              })}
            </div>

            <p className="mt-8 text-xs text-[var(--color-text-muted)] leading-relaxed">
              This is a probable source based on current sensor signatures, not a confirmed identification.
            </p>

            <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)] space-y-3">
              {ranked.slice(1, 4).map((r) => (
                <ConfidenceBar key={r.source.id} value={r.confidence} label={r.source.label} />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-8 flex items-center justify-center">
            <SensorFusionDiagram resultLabel={source.label} />
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
