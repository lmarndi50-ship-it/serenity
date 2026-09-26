import { cx } from '@/utils/format'

type Tone = 'emerald' | 'cyan' | 'amber' | 'red' | 'muted'

const TONE_DOT: Record<Tone, string> = {
  emerald: 'bg-[var(--color-accent-emerald)]',
  cyan: 'bg-[var(--color-accent-cyan)]',
  amber: 'bg-[var(--color-warning)]',
  red: 'bg-[var(--color-danger)]',
  muted: 'bg-[var(--color-text-muted)]',
}

const TONE_TEXT: Record<Tone, string> = {
  emerald: 'text-[var(--color-accent-emerald)]',
  cyan: 'text-[var(--color-accent-cyan)]',
  amber: 'text-[var(--color-warning)]',
  red: 'text-[var(--color-danger)]',
  muted: 'text-[var(--color-text-muted)]',
}

export function StatusBadge({
  tone = 'emerald',
  pulse = true,
  children,
  className,
}: {
  tone?: Tone
  pulse?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 text-xs font-data tracking-[0.15em] uppercase',
        TONE_TEXT[tone],
        className,
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', TONE_DOT[tone], pulse && 'pulse-dot')} aria-hidden="true" />
      {children}
    </span>
  )
}
