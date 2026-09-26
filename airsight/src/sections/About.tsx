import { motion } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PrivacyVisual } from '@/components/ui/PrivacyVisual'
import { OfflineModeVisual } from '@/components/ui/OfflineModeVisual'
import { DataStorageStats } from '@/components/ui/DataStorageStats'

const STORY = ['The Air', 'Is Measured', 'Data Is Understood', 'Source Is Identified', 'Future Is Forecast', 'You Get A Recommendation', 'You Take Action']

export function About() {
  return (
    <section id="about" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 space-y-28">
        <div>
          <SectionHeading
            eyebrow="Privacy"
            title="Your environment. Your data."
            subtitle="Raw audio, images and sensitive information never need to leave the device for the system to make local decisions."
            align="center"
            className="mx-auto"
          />
          <div className="mt-14">
            <PrivacyVisual />
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Offline Mode"
            title="When the network disappears, intelligence stays."
            subtitle="Toggle the network switch in the demo panel — sensing and inference keep running either way."
            align="center"
            className="mx-auto"
          />
          <div className="mt-14">
            <OfflineModeVisual />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Local Storage" title="Nothing leaves this node unless summarized." align="center" className="mx-auto" />
          <div className="mt-14 max-w-3xl mx-auto">
            <DataStorageStats />
          </div>
        </div>

        <div className="text-center">
          <span className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
            Built for Edge AI Innovation
          </span>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-3 gap-y-3 max-w-3xl mx-auto">
            {STORY.map((step, i) => (
              <motion.span
                key={step}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <span className="font-data text-xs sm:text-sm text-[var(--color-text-secondary)]">{step}</span>
                {i < STORY.length - 1 && <span className="text-[var(--color-text-muted)]">→</span>}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
