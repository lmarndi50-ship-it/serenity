import { motion } from 'framer-motion'
import { Wifi, WifiOff, HardDrive, BrainCircuit, CheckCircle2, ArrowDown } from 'lucide-react'
import { useAirSight } from '@/hooks/useAirSightState'
import { GlassCard } from './GlassCard'
import { cx } from '@/utils/format'

const CHAIN = [
  { icon: HardDrive, label: 'Local Storage' },
  { icon: BrainCircuit, label: 'Edge AI' },
  { icon: CheckCircle2, label: 'Local Decision' },
]

export function OfflineModeVisual() {
  const { networkOnline } = useAirSight()

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ opacity: networkOnline ? 1 : 0.35 }}
          className="flex items-center gap-2 font-data text-sm text-[var(--color-text-secondary)]"
        >
          {networkOnline ? <Wifi size={18} /> : <WifiOff size={18} className="text-[var(--color-danger)]" />}
          Wi-Fi {networkOnline ? 'Connected' : 'Disconnected'}
        </motion.div>
        <ArrowDown size={16} className="text-[var(--color-text-muted)]" />
        {CHAIN.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-3">
            <span
              className={cx(
                'flex items-center gap-2 px-4 py-2 rounded-full border font-data text-sm',
                'bg-[var(--color-accent-emerald)]/10 border-[var(--color-accent-emerald)]/30 text-[var(--color-accent-emerald)]',
              )}
            >
              <step.icon size={15} />
              {step.label}
            </span>
            {i < CHAIN.length - 1 && <ArrowDown size={16} className="text-[var(--color-text-muted)]" />}
          </div>
        ))}
      </div>

      <GlassCard className="p-6 grid grid-cols-2 gap-6">
        {[
          { label: 'Network Status', value: networkOnline ? 'Online' : 'Offline', tone: networkOnline },
          { label: 'AI Status', value: 'Active', tone: true },
          { label: 'Data Collection', value: 'Active', tone: true },
          { label: 'Local Storage', value: 'Active', tone: true },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
              {s.label}
            </div>
            <div
              className="font-data text-lg font-semibold"
              style={{ color: s.tone ? 'var(--color-accent-emerald)' : 'var(--color-danger)' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  )
}
