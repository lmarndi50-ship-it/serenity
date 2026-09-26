import { motion } from 'framer-motion'
import { MAP_NODES } from '@/data/nodes'

export function NetworkTopology() {
  return (
    <div className="grid sm:grid-cols-3 gap-3 max-w-md mx-auto">
      {MAP_NODES.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="glass-panel rounded-xl px-3 py-3 text-center"
        >
          <div className="text-[10px] font-data text-[var(--color-text-muted)] tracking-wider">
            NODE {String(i + 1).padStart(2, '0')}
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-emerald)] mx-auto mt-2 pulse-dot" />
        </motion.div>
      ))}
    </div>
  )
}
