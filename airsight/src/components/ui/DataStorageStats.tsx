import { useAirSight } from '@/hooks/useAirSightState'
import { GlassCard } from './GlassCard'
import { SimulatedBadge } from './SimulatedBadge'

export function DataStorageStats() {
  const { totalReadingsLogged } = useAirSight()

  const stats = [
    { value: totalReadingsLogged.toLocaleString(), label: 'Sensor Readings' },
    { value: '7 days', label: 'Stored Locally' },
    { value: '0', label: 'Cloud AI Calls' },
  ]

  return (
    <GlassCard className="p-8 sm:p-10">
      <div className="flex items-center justify-between mb-8">
        <span className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
          Local History
        </span>
        <SimulatedBadge />
      </div>
      <div className="grid sm:grid-cols-3 gap-8 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-data text-4xl font-bold text-[var(--color-accent-emerald)]">{stat.value}</div>
            <div className="text-xs tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mt-2">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
