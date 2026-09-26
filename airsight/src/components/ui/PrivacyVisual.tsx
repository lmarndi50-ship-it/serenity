import { motion } from 'framer-motion'
import { Mic, Camera, MapPinned, BrainCircuit, Lock } from 'lucide-react'

const ITEMS = [
  { icon: Mic, label: 'Raw Audio', result: 'Stays Local' },
  { icon: Camera, label: 'Raw Image', result: 'Stays Local' },
  { icon: MapPinned, label: 'Location', result: 'Stays Local' },
  { icon: BrainCircuit, label: 'AI Inference', result: 'Local' },
]

export function PrivacyVisual() {
  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          className="glass-panel rounded-xl p-5 flex items-center gap-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--color-text-secondary)]">
            <item.icon size={18} />
          </span>
          <div className="flex-1">
            <div className="text-sm text-[var(--color-text-primary)] font-medium">{item.label}</div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-data text-[var(--color-accent-emerald)] tracking-wide">
            <Lock size={12} />
            {item.result}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
