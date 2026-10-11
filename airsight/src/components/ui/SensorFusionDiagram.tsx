import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

const INPUTS = ['PM2.5', 'PM10', 'CO', 'NO₂', 'VOC', 'TEMP', 'HUMIDITY']

export function SensorFusionDiagram({ resultLabel }: { resultLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {INPUTS.map((input, i) => (
          <motion.span
            key={input}
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="relative text-xs font-data px-3 py-1.5 rounded-full border border-white/10 text-[var(--color-text-secondary)] overflow-hidden"
          >
            <span
              className="absolute inset-0 opacity-40"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(79,224,255,0.45), transparent)',
                backgroundSize: '200% 100%',
                animation: `flowStripe 2.4s linear infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
            <span className="relative">{input}</span>
          </motion.span>
        ))}
      </div>

      <ArrowDown size={18} className="text-[var(--color-text-muted)]" />

      <div className="glass-panel rounded-xl px-6 py-3 text-sm font-data tracking-[0.15em] uppercase text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30">
        Sensor Fusion
      </div>

      <ArrowDown size={18} className="text-[var(--color-text-muted)]" />

      <div className="glass-panel rounded-xl px-6 py-3 text-sm font-data tracking-[0.15em] uppercase text-[var(--color-accent-emerald)] border-[var(--color-accent-emerald)]/30">
        Edge AI
      </div>

      <ArrowDown size={18} className="text-[var(--color-text-muted)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glow-emerald rounded-xl px-8 py-4 bg-[var(--color-accent-emerald)]/10 border border-[var(--color-accent-emerald)]/40 text-lg font-data font-semibold tracking-[0.15em] uppercase text-[var(--color-accent-emerald)]"
      >
        {resultLabel}
      </motion.div>

      <style>{`
        @keyframes flowStripe {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
