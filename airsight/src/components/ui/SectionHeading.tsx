import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { MicroLabel } from './MicroLabel'
import { cx } from '@/utils/format'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', className }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      className={cx('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}
    >
      {eyebrow && <MicroLabel className="text-[var(--color-accent-cyan)] mb-4">{eyebrow}</MicroLabel>}
      <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold text-[var(--color-text-primary)] text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed text-balance">
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
