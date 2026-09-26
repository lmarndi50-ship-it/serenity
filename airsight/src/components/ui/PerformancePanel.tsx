import { useEffect, useState } from 'react'
import { useAirSight } from '@/hooks/useAirSightState'
import { GlassCard } from './GlassCard'
import { SimulatedBadge } from './SimulatedBadge'

export function PerformancePanel() {
  const { aiEnabled, networkOnline } = useAirSight()
  const [inference, setInference] = useState(12)
  const [cpu, setCpu] = useState(34)
  const [memory, setMemory] = useState(41)

  useEffect(() => {
    const id = setInterval(() => {
      setInference((v) => Math.max(6, Math.min(28, v + (Math.random() - 0.5) * 4)))
      setCpu((v) => Math.max(18, Math.min(62, v + (Math.random() - 0.5) * 6)))
      setMemory((v) => Math.max(28, Math.min(58, v + (Math.random() - 0.5) * 4)))
    }, 1800)
    return () => clearInterval(id)
  }, [])

  const stats = [
    { label: 'Inference', value: aiEnabled ? `${inference.toFixed(0)} ms` : '—' },
    { label: 'CPU', value: aiEnabled ? `${cpu.toFixed(0)}%` : '0%' },
    { label: 'Memory', value: `${memory.toFixed(0)}%` },
    { label: 'Model', value: 'TFLite' },
    { label: 'Mode', value: aiEnabled ? 'Local' : 'Idle' },
    { label: 'Network', value: networkOnline ? 'Optional · Online' : 'Optional · Offline' },
  ]

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
          Edge AI Performance
        </span>
        <SimulatedBadge />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
              {stat.label}
            </div>
            <div className="font-data text-xl font-semibold text-[var(--color-text-primary)]">{stat.value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
