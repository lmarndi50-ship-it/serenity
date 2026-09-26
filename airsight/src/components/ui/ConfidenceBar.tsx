export function ConfidenceBar({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-data mb-1.5">
        <span className={highlight ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-text-secondary)]'}>
          {label}
        </span>
        <span className={highlight ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-text-muted)]'}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: highlight
              ? 'linear-gradient(90deg, #3CFFA6, #4FE0FF)'
              : 'rgba(255,255,255,0.25)',
          }}
        />
      </div>
    </div>
  )
}
