import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { ForecastChart } from '@/components/ui/ForecastChart'
import { SimulatedBadge } from '@/components/ui/SimulatedBadge'
import { useAirSight } from '@/hooks/useAirSightState'

export function Forecast() {
  const { forecast } = useAirSight()
  const start = forecast[0].pm25
  const end = forecast[forecast.length - 1].pm25
  const delta = end - start
  const rising = delta > 4
  const falling = delta < -4

  return (
    <section id="forecast" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Forecast" title="What happens next?" />

        <GlassCard className="mt-14 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-6 text-xs font-data">
              <span className="flex items-center gap-1.5 text-[var(--color-accent-emerald)]">
                <span className="h-0.5 w-5 bg-[var(--color-accent-emerald)]" /> Observed
              </span>
              <span className="flex items-center gap-1.5 text-[var(--color-accent-cyan)]">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-[var(--color-accent-cyan)]" /> Predicted
              </span>
            </div>
            <SimulatedBadge />
          </div>

          <ForecastChart />

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 pt-6 border-t border-[var(--color-border-subtle)]">
            <div
              className={
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-data tracking-[0.1em] uppercase ' +
                (rising
                  ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/30'
                  : falling
                    ? 'bg-[var(--color-accent-emerald)]/10 text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30'
                    : 'bg-white/5 text-[var(--color-text-secondary)] border border-white/10')
              }
            >
              {rising ? <TrendingUp size={14} /> : falling ? <TrendingDown size={14} /> : <Minus size={14} />}
              Forecast: Pollution likely to {rising ? 'increase' : falling ? 'decrease' : 'stay stable'}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              PM2.5 is predicted to {rising ? 'rise' : falling ? 'fall' : 'remain steady'} over the next four hours
              based on recent local sensor history and the current scenario trend.
            </p>
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
