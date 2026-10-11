import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Radio } from 'lucide-react'
import { MAP_NODES } from '@/data/nodes'
import { useAirSight } from '@/hooks/useAirSightState'
import { bandForPm, BAND_META, METRIC_THRESHOLDS } from '@/utils/aqi'
import { timeAgo } from '@/utils/format'
import { cx } from '@/utils/format'

export function PollutionMap() {
  const { current, sourceInference, lastUpdateTs, networkOnline } = useAirSight()
  const [selected, setSelected] = useState<string | null>(null)

  const nodeReadings = MAP_NODES.map((node) => {
    const pm25 = Math.round(Math.min(280, current.pm25 * node.intensity))
    const band = bandForPm(pm25, METRIC_THRESHOLDS.pm25)
    return { ...node, pm25, band }
  })

  const selectedNode = nodeReadings.find((n) => n.id === selected)

  return (
    <div className="relative">
      <div className="relative h-[420px] sm:h-[480px] rounded-2xl overflow-hidden glass-panel">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {nodeReadings.map((node) => (
          <div
            key={node.id}
            className="absolute rounded-full pointer-events-none animate-pulse"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: 90 + node.pm25 * 0.6,
              height: 90 + node.pm25 * 0.6,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${BAND_META[node.band].color}33, transparent 70%)`,
            }}
          />
        ))}

        {nodeReadings.map((node) => (
          <button
            key={node.id}
            onClick={() => setSelected(node.id)}
            className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-label={`${node.name}, PM2.5 ${node.pm25}`}
          >
            <span
              className="flex h-4 w-4 rounded-full border-2 border-white/30 group-hover:scale-125 transition-transform"
              style={{ background: BAND_META[node.band].color, boxShadow: `0 0 14px ${BAND_META[node.band].color}` }}
            />
            <span className="text-[10px] font-data px-1.5 py-0.5 rounded bg-black/40 text-[var(--color-text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {node.zone}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-data">
        {(['good', 'moderate', 'unhealthy', 'critical'] as const).map((band) => (
          <span key={band} className="flex items-center gap-1.5" style={{ color: BAND_META[band].color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: BAND_META[band].color }} />
            {BAND_META[band].label}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mt-6 glass-panel rounded-2xl p-6 relative"
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label="Close node detail"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Radio size={15} className="text-[var(--color-accent-emerald)]" />
              <span className="font-semibold text-[var(--color-text-primary)]">{selectedNode.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">PM2.5</div>
                <div className="font-data text-2xl font-semibold" style={{ color: BAND_META[selectedNode.band].color }}>
                  {selectedNode.pm25}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">Status</div>
                <div className={cx('font-data text-sm mt-2 font-semibold')} style={{ color: BAND_META[selectedNode.band].color }}>
                  {BAND_META[selectedNode.band].label}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">Probable Source</div>
                <div className="font-data text-sm mt-2 text-[var(--color-text-primary)]">{sourceInference.source.label}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">Last Update</div>
                <div className="font-data text-sm mt-2 text-[var(--color-text-primary)]">
                  {networkOnline ? timeAgo(lastUpdateTs) : 'Synced locally'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
