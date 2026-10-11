import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'

const CLOUD_STEPS = ['Sensor', 'Internet', 'Cloud', 'AI', 'Decision']
const EDGE_STEPS = ['Sensor', 'Arduino UNO Q', 'Edge AI', 'Decision', 'Action']

const BADGES = ['Low Latency', 'Offline Ready', 'Private', 'No Cloud AI']

function FlowColumn({
  title,
  steps,
  glow,
}: {
  title: string
  steps: string[]
  glow?: boolean
}) {
  return (
    <GlassCard className={`p-8 flex flex-col items-center ${glow ? 'glow-emerald' : ''}`} glow="none">
      <div className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data mb-6">{title}</div>
      <div className="flex flex-col items-center gap-2">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: glow ? i * 0.15 : i * 0.08 }}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={`font-data text-sm px-5 py-2.5 rounded-full border ${
                glow
                  ? 'border-[var(--color-accent-emerald)]/40 text-[var(--color-accent-emerald)] bg-[var(--color-accent-emerald)]/5'
                  : 'border-white/10 text-[var(--color-text-secondary)]'
              }`}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <ArrowDown size={16} className={glow ? 'text-[var(--color-accent-emerald)]/60' : 'text-[var(--color-text-muted)]'} />
            )}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  )
}

export function EdgeAIArchitecture() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Why Edge AI"
          title="Intelligence at the source."
          subtitle="Instead of shipping raw sensor data to a remote server, inference runs directly on the Arduino UNO Q — so decisions happen in milliseconds, with or without a network."
        />

        <div className="mt-16 grid md:grid-cols-2 gap-8 items-start">
          <FlowColumn title="Traditional Cloud Monitoring" steps={CLOUD_STEPS} />
          <FlowColumn title="AIRSIGHT" steps={EDGE_STEPS} glow />
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {BADGES.map((badge) => (
            <span
              key={badge}
              className="text-xs font-data tracking-[0.1em] uppercase px-4 py-2 rounded-full border border-[var(--color-accent-cyan)]/25 text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/5"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
