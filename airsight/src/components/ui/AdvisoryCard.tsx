import { Route, ShieldAlert, Fan, AlertTriangle, Wind, CheckCircle2, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import type { AdvisoryContent } from '@/types'
import { GlassCard } from './GlassCard'

const ICONS: Record<string, LucideIcon> = { Route, ShieldAlert, Fan, AlertTriangle, Wind, CheckCircle2 }

export function AdvisoryCard({ advisory, delay = 0 }: { advisory: AdvisoryContent; delay?: number }) {
  const Icon = ICONS[advisory.icon] ?? AlertTriangle
  const isNormal = advisory.id === 'normal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard className="p-7" glow={isNormal ? 'emerald' : 'cyan'}>
        <div className="flex items-start gap-4">
          <span
            className={
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' +
              (isNormal
                ? 'bg-[var(--color-accent-emerald)]/10 text-[var(--color-accent-emerald)]'
                : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]')
            }
          >
            <Icon size={20} />
          </span>
          <div>
            <div className="text-xs tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
              {isNormal ? 'Status Normal' : 'Air Quality Changing'}
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] leading-snug">
              {advisory.headline}
            </h3>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">{advisory.body}</p>

        <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-accent-emerald)] font-data mb-1.5">
            Recommended Action
          </div>
          <p className="text-sm text-[var(--color-text-primary)] font-medium">{advisory.action}</p>
        </div>

        <div className="mt-4">
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-2">
            Why?
          </div>
          <div className="flex flex-wrap gap-2">
            {advisory.why.map((reason) => (
              <span
                key={reason}
                className="text-xs font-data px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--color-text-secondary)]"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
