import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

const TOP_STEPS = ['Environment', 'Sensors', 'STM32U585', 'Data Processing', 'Qualcomm QRB2210', 'Edge AI']
const BRANCHES = ['Classify', 'Forecast', 'Sensor Fusion']
const BOTTOM_STEPS = ['Decision Engine', 'Action']

function StepPill({ label, index, emphasize = false }: { label: string; index: number; emphasize?: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={
        'font-data text-sm px-5 py-2.5 rounded-full border ' +
        (emphasize
          ? 'border-[var(--color-accent-emerald)]/40 text-[var(--color-accent-emerald)] bg-[var(--color-accent-emerald)]/5'
          : 'border-white/10 text-[var(--color-text-secondary)]')
      }
    >
      {label}
    </motion.span>
  )
}

export function ArchitectureFlow() {
  return (
    <div className="flex flex-col items-center gap-2">
      {TOP_STEPS.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2">
          <StepPill label={step} index={i} emphasize={step === 'Edge AI'} />
          <ArrowDown size={16} className="text-[var(--color-text-muted)]" />
        </div>
      ))}

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        {BRANCHES.map((branch, i) => (
          <StepPill key={branch} label={branch} index={i} emphasize />
        ))}
      </div>

      <ArrowDown size={16} className="text-[var(--color-text-muted)] mt-2" />

      {BOTTOM_STEPS.map((step, i) => (
        <div key={step} className="flex flex-col items-center gap-2">
          <StepPill label={step} index={i} emphasize={step === 'Action'} />
          {i < BOTTOM_STEPS.length - 1 && <ArrowDown size={16} className="text-[var(--color-text-muted)]" />}
        </div>
      ))}
    </div>
  )
}
