import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sliders, X, Wifi, WifiOff, Brain, BrainCircuit } from 'lucide-react'
import { useAirSight } from '@/hooks/useAirSightState'
import { SCENARIOS } from '@/data/scenarios'
import type { ScenarioId } from '@/types'
import { cx } from '@/utils/format'

const SCENARIO_ORDER: ScenarioId[] = ['normal', 'traffic', 'construction', 'cooking', 'burning']

export function DemoController() {
  const [open, setOpen] = useState(false)
  const { scenario, setScenario, networkOnline, setNetworkOnline, aiEnabled, setAiEnabled } = useAirSight()

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="glass-panel rounded-2xl w-72 p-5"
            role="dialog"
            aria-label="Demo scenario controls"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
                Demo Scenario
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close demo controls"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Demo scenario">
              {SCENARIO_ORDER.map((id) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={scenario === id}
                  onClick={() => setScenario(id)}
                  className={cx(
                    'flex items-center gap-3 text-left px-3 py-2 rounded-xl text-sm transition-colors',
                    scenario === id
                      ? 'bg-[var(--color-accent-emerald)]/10 text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 border border-transparent',
                  )}
                >
                  <span
                    className={cx(
                      'h-2.5 w-2.5 rounded-full border',
                      scenario === id
                        ? 'bg-[var(--color-accent-emerald)] border-[var(--color-accent-emerald)]'
                        : 'border-[var(--color-text-muted)]',
                    )}
                  />
                  {SCENARIOS[id].label}
                </button>
              ))}
            </div>

            <div className="h-px bg-[var(--color-border-subtle)] my-4" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                {networkOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
                Network
              </span>
              <button
                onClick={() => setNetworkOnline(!networkOnline)}
                className={cx(
                  'relative h-6 w-11 rounded-full transition-colors',
                  networkOnline ? 'bg-[var(--color-accent-emerald)]/70' : 'bg-white/10',
                )}
                role="switch"
                aria-checked={networkOnline}
                aria-label="Toggle network connectivity"
              >
                <span
                  className={cx(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    networkOnline ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                {aiEnabled ? <BrainCircuit size={15} /> : <Brain size={15} />}
                Edge AI
              </span>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={cx(
                  'relative h-6 w-11 rounded-full transition-colors',
                  aiEnabled ? 'bg-[var(--color-accent-cyan)]/70' : 'bg-white/10',
                )}
                role="switch"
                aria-checked={aiEnabled}
                aria-label="Toggle edge AI inference"
              >
                <span
                  className={cx(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    aiEnabled ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-panel glow-emerald rounded-full h-14 w-14 flex items-center justify-center text-[var(--color-accent-emerald)] hover:scale-105 transition-transform"
        aria-label={open ? 'Close demo mode' : 'Open demo mode'}
      >
        <Sliders size={20} />
      </button>
    </div>
  )
}
