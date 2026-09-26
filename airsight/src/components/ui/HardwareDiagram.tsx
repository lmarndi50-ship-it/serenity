import { useState } from 'react'
import {
  Wind,
  FlaskConical,
  Cloud,
  Sparkles,
  Thermometer,
  MonitorSmartphone,
  Radio,
  BatteryCharging,
  Cpu,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { HARDWARE_COMPONENTS } from '@/data/hardware'
import { GlassCard } from './GlassCard'
import { cx } from '@/utils/format'

const ICONS: Record<string, LucideIcon> = {
  Wind,
  FlaskConical,
  Cloud,
  Sparkles,
  Thermometer,
  MonitorSmartphone,
  Radio,
  BatteryCharging,
}

export function HardwareDiagram() {
  const [selectedId, setSelectedId] = useState<string>(HARDWARE_COMPONENTS[0].id)
  const selected = HARDWARE_COMPONENTS.find((c) => c.id === selectedId)!

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
      <div className="relative h-[380px] sm:h-[440px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="glass-panel glow-emerald rounded-2xl h-28 w-40 flex flex-col items-center justify-center">
            <Cpu size={22} className="text-[var(--color-accent-emerald)] mb-1" />
            <span className="font-data text-xs tracking-wider text-[var(--color-text-primary)]">ARDUINO UNO Q</span>
          </div>
        </div>

        {HARDWARE_COMPONENTS.map((component) => {
          const Icon = ICONS[component.icon]
          const active = component.id === selectedId
          return (
            <div key={component.id}>
              <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${component.x}%`}
                  y2={`${component.y}%`}
                  stroke={active ? 'var(--color-accent-emerald)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={active ? 1.5 : 1}
                />
              </svg>
              <button
                onClick={() => setSelectedId(component.id)}
                className={cx(
                  'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 group',
                )}
                style={{ left: `${component.x}%`, top: `${component.y}%` }}
              >
                <span
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-xl border transition-all',
                    active
                      ? 'bg-[var(--color-accent-emerald)]/15 border-[var(--color-accent-emerald)]/50 text-[var(--color-accent-emerald)] scale-110'
                      : 'bg-white/5 border-white/10 text-[var(--color-text-secondary)] group-hover:border-white/30',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="text-[10px] font-data text-[var(--color-text-muted)] whitespace-nowrap">
                  {component.name}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <GlassCard className="p-6 sm:p-7 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">{selected.name}</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
                  Purpose
                </dt>
                <dd className="text-[var(--color-text-secondary)] leading-relaxed">{selected.purpose}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
                  Interface
                </dt>
                <dd className="text-[var(--color-text-primary)] font-data">{selected.interface}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
                  Data Collected
                </dt>
                <dd className="text-[var(--color-text-primary)] font-data">{selected.dataCollected}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data mb-1">
                  Role in AI Pipeline
                </dt>
                <dd className="text-[var(--color-text-secondary)] leading-relaxed">{selected.role}</dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </div>
  )
}
