import { Info } from 'lucide-react'

export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase text-[var(--color-text-muted)] font-data ${className ?? ''}`}
      title="This site runs on a local data simulation engine so the interface works without connected hardware."
    >
      <Info size={11} />
      Simulated data
    </span>
  )
}
