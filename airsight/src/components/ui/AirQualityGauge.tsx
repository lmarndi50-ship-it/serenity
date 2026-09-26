import { BAND_META } from '@/utils/aqi'
import type { AqiBand } from '@/types'

export function AirQualityGauge({
  index,
  band,
  dominant,
}: {
  index: number
  band: AqiBand
  dominant: string
}) {
  const size = 260
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, index / 220)
  const offset = circumference * (1 - pct)
  const meta = BAND_META[band]

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={meta.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s var(--ease-out-quart), stroke 0.6s ease',
              filter: `drop-shadow(0 0 10px ${meta.color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
            Air Quality
          </span>
          <span className="font-data text-6xl font-bold text-[var(--color-text-primary)] leading-none mt-2">
            {index}
          </span>
          <span className="font-data text-sm font-semibold mt-2 tracking-[0.15em]" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </div>
      <p className="mt-6 text-sm text-[var(--color-text-secondary)] text-center max-w-xs">{meta.description}</p>
      <div className="mt-4 text-xs font-data text-[var(--color-text-muted)] tracking-wide">
        Dominant pollutant: <span className="text-[var(--color-text-primary)]">{dominant}</span>
      </div>
    </div>
  )
}
