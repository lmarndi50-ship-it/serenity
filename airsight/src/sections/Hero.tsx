import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Cpu, Radio } from 'lucide-react'
import { useAirSight } from '@/hooks/useAirSightState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { MicroLabel } from '@/components/ui/MicroLabel'
import { SceneErrorBoundary } from '@/components/three/SceneErrorBoundary'
import { bandForIndex, compositeIndex } from '@/utils/aqi'

const EdgeNodeScene = lazy(() => import('@/three/EdgeNodeScene').then((m) => ({ default: m.EdgeNodeScene })))

function FloatingCard({
  label,
  value,
  unit,
  sub,
  className,
  delay = 0,
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  className: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 1, 0.5, 1] }}
      className={`glass-panel rounded-xl px-4 py-3 absolute animate-drift ${className}`}
      style={{ animationDelay: `${delay * 2}s` }}
    >
      <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)] font-data">{label}</div>
      <div className="font-data text-xl text-[var(--color-text-primary)] leading-tight mt-0.5">
        {value}
        {unit && <span className="text-xs text-[var(--color-text-secondary)] ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] text-[var(--color-accent-emerald)] font-data mt-0.5">{sub}</div>}
    </motion.div>
  )
}

export function Hero() {
  const { current, aiEnabled } = useAirSight()
  const index = compositeIndex(current)
  const band = bandForIndex(index)

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="overview" className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center w-full">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <MicroLabel className="text-[var(--color-accent-cyan)] mb-6">
              <Cpu size={13} /> Edge AI Environmental Intelligence
            </MicroLabel>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="text-[clamp(2.5rem,6vw,5.25rem)] leading-[1.02] font-semibold text-balance"
          >
            Know Your Air.
            <br />
            <span className="text-gradient">Before It Becomes a Problem.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="mt-6 text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed text-balance"
          >
            Hyperlocal air-quality intelligence powered by Arduino UNO Q. Sense, predict, identify and act — directly
            at the edge.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Button onClick={() => scrollTo('live-air')}>
              Explore Live Air <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" onClick={() => scrollTo('hardware')}>
              View System
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3"
          >
            <StatusBadge tone="emerald">Edge Node Online</StatusBadge>
            <StatusBadge tone="cyan" pulse={false}>
              AI Inference: {aiEnabled ? 'Local' : 'Paused'}
            </StatusBadge>
            <StatusBadge tone="muted" pulse={false}>
              Network: Optional
            </StatusBadge>
          </motion.div>
        </div>

        <div className="relative h-[420px] sm:h-[520px] lg:h-[600px]">
          <SceneErrorBoundary
            fallback={
              <div className="absolute inset-0 rounded-3xl glass-panel flex flex-col items-center justify-center gap-3">
                <Radio size={28} className="text-[var(--color-accent-emerald)] pulse-dot" />
                <span className="text-xs font-data tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Edge Node · 3D Preview Unavailable
                </span>
              </div>
            }
          >
            <Suspense fallback={<div className="absolute inset-0 rounded-3xl bg-[var(--color-bg-panel)]/40" />}>
              <EdgeNodeScene className="absolute inset-0" />
            </Suspense>
          </SceneErrorBoundary>

          <FloatingCard
            label="PM2.5"
            value={current.pm25.toFixed(0)}
            unit="µg/m³"
            sub={band === 'good' ? 'NORMAL' : band.toUpperCase()}
            className="top-4 left-0 sm:left-2"
          />
          <FloatingCard
            label="CO₂"
            value={current.co2.toFixed(0)}
            unit="ppm"
            className="top-10 right-0 sm:right-2"
            delay={0.15}
          />
          <FloatingCard
            label="VOC"
            value={current.voc < 150 ? 'LOW' : current.voc < 250 ? 'MODERATE' : 'HIGH'}
            className="bottom-24 left-0 hidden sm:block"
            delay={0.3}
          />
          <FloatingCard
            label="AI"
            value={aiEnabled ? 'LOCAL' : 'IDLE'}
            sub="TFLite · On-device"
            className="bottom-6 right-0 sm:right-4"
            delay={0.45}
          />
        </div>
      </div>
    </section>
  )
}
