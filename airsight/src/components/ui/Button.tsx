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
          'bg-[linear-gradient(120deg,#3cffa6,#4fe0ff)] text-[#050b0a] shadow-[0_8px_24px_-8px_rgba(60,255,166,0.5)] hover:shadow-[0_10px_36px_-6px_rgba(60,255,166,0.65)] hover:-translate-y-0.5',
        variant === 'secondary' &&
          'border border-[var(--color-border-strong)] text-[var(--color-text-primary)] bg-white/[0.03] hover:border-[var(--color-accent-cyan)]/60 hover:text-[var(--color-accent-cyan)] hover:bg-white/[0.05]',
        variant === 'ghost' && 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
