import { motion } from 'framer-motion'
import { MapPin, ArrowDown } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'

const LOCATIONS = [
  { label: 'Main Road', value: 118, top: '18%', left: '12%' },
  { label: 'Classroom', value: 34, top: '8%', left: '58%' },
  { label: 'Kitchen', value: 76, top: '48%', left: '78%' },
  { label: 'Construction Site', value: 152, top: '68%', left: '30%' },
  { label: 'Residential Area', value: 42, top: '72%', left: '65%' },
]

function valueColor(value: number) {
  if (value <= 50) return 'var(--color-accent-emerald)'
  if (value <= 100) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export function Problem() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="The Problem"
          title="City-wide AQI isn't enough."
          subtitle="Air quality changes from street to street, room to room, and minute to minute — a single city number can't capture any of it."
        />

        <div className="mt-16 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center lg:items-start gap-3 font-data text-sm"
          >
            <span className="tracking-[0.2em] uppercase text-[var(--color-text-secondary)]">City AQI</span>
            <ArrowDown className="text-[var(--color-text-muted)]" size={18} />
            <span className="text-3xl font-semibold text-[var(--color-text-primary)]">One Number</span>
            <ArrowDown className="text-[var(--color-text-muted)]" size={18} />
            <span className="tracking-[0.2em] uppercase text-[var(--color-accent-emerald)]">
              But Pollution Is Local
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="relative h-80 sm:h-96 glass-panel rounded-2xl overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {LOCATIONS.map((loc, i) => (
              <motion.div
                key={loc.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="absolute flex flex-col items-center gap-1"
                style={{ top: loc.top, left: loc.left }}
              >
                <MapPin
                  size={20}
                  style={{ color: valueColor(loc.value) }}
                  className="drop-shadow-[0_0_8px_rgba(57,255,154,0.4)]"
                />
                <div className="glass-panel rounded-lg px-2 py-1 text-center whitespace-nowrap">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-data">
                    {loc.label}
                  </div>
                  <div className="text-xs font-data font-semibold" style={{ color: valueColor(loc.value) }}>
                    {loc.value}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
