import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/utils/format'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: 'emerald' | 'cyan' | 'none'
  interactive?: boolean
}

export function GlassCard({ children, className, glow = 'none', interactive = false, ...rest }: GlassCardProps) {
  return (
    <div
      className={cx(
        'glass-panel rounded-2xl',
        glow === 'emerald' && 'glow-emerald',
        glow === 'cyan' && 'glow-cyan',
        interactive &&
          'transition-all duration-300 hover:border-white/20 hover:-translate-y-1 cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
