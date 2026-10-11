import type { ReactNode } from 'react'
import { cx } from '@/utils/format'

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-medium text-[var(--color-text-secondary)] font-data',
        className,
      )}
    >
      {children}
    </span>
  )
}
