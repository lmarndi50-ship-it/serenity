import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/utils/format'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-all duration-300',
        variant === 'primary' &&
          'bg-[var(--color-accent-emerald)] text-[#06100f] hover:shadow-[0_0_32px_-4px_rgba(57,255,154,0.6)] hover:-translate-y-0.5',
        variant === 'secondary' &&
          'border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)]/50 hover:text-[var(--color-accent-cyan)]',
        variant === 'ghost' && 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
