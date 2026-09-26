import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import type { AqiBand } from '@/types'
import { cx } from '@/utils/format'

const BAND_TONE: Record<AqiBand, string> = {
  good: 'text-[var(--color-accent-emerald)]',
  moderate: 'text-[var(--color-warning)]',
  unhealthy: 'text-[#ff8a3d]',
  critical: 'text-[var(--color-danger)]',
}

const BAND_LABEL: Record<AqiBand, string> = {
  good: 'Normal',
  moderate: 'Moderate',
  unhealthy: 'Unhealthy',
  critical: 'Critical',
}

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  band?: AqiBand
  delay?: number
}

export function MetricCard({ icon: Icon, label, value, unit, band, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard interactive className="p-5 h-full relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">
            {label}
          </span>
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-white/5">
            <Icon size={13} className="text-[var(--color-text-secondary)]" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-emerald)] pulse-dot" />
          </span>
        </div>
        <div className="font-data text-3xl font-semibold text-[var(--color-text-primary)] leading-none">
          {value}
          {unit && <span className="text-sm text-[var(--color-text-secondary)] ml-1.5">{unit}</span>}
        </div>
        {band && (
          <div className={cx('mt-3 text-xs font-medium tracking-wide', BAND_TONE[band])}>{BAND_LABEL[band]}</div>
        )}
      </GlassCard>
    </motion.div>
  )
}
