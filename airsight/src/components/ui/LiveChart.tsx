import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useAirSight, type TimeRange } from '@/hooks/useAirSightState'
import type { Reading } from '@/types'
import { formatClock, cx } from '@/utils/format'

const RANGES: TimeRange[] = ['1H', '6H', '12H', '24H']

function TooltipCard({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-lg px-3 py-2 text-xs font-data">
      <div className="text-[var(--color-text-muted)] mb-1">{typeof label === 'number' ? formatClock(label) : label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

export function LiveChart() {
  const { visibleHistory, timeRange, setTimeRange, liveMode, setLiveMode } = useAirSight()
  const [frozen, setFrozen] = useState<Reading[] | null>(null)

  useEffect(() => {
    if (!liveMode) {
      setFrozen(visibleHistory)
    } else {
      setFrozen(null)
    }
    // only snapshot at the moment history mode is engaged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode])

  const data = useMemo(
    () => (frozen ?? visibleHistory).map((r) => ({ ...r, time: r.timestamp })),
    [frozen, visibleHistory],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 text-xs font-data">
          <span className="flex items-center gap-1.5 text-[var(--color-accent-emerald)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-emerald)]" /> PM2.5
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-warning)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" /> PM10
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-cyan)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-cyan)]" /> CO₂
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-[var(--color-border-subtle)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cx(
                  'px-3 py-1 text-xs font-data rounded-full transition-colors',
                  timeRange === r
                    ? 'bg-[var(--color-accent-emerald)] text-[#06100f]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-[var(--color-border-subtle)] p-0.5">
            {(['LIVE', 'HISTORY'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setLiveMode(mode === 'LIVE')}
                className={cx(
                  'px-3 py-1 text-xs font-data rounded-full transition-colors',
                  (mode === 'LIVE') === liveMode
                    ? 'bg-[var(--color-accent-cyan)] text-[#06100f]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72 sm:h-80 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39FF9A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#39FF9A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={(t: number) => formatClock(t)}
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              minTickGap={40}
            />
            <YAxis
              yAxisId="pm"
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              width={36}
            />
            <YAxis
              yAxisId="co2"
              orientation="right"
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              width={44}
            />
            <Tooltip content={<TooltipCard />} />
            <Area
              yAxisId="pm"
              type="monotone"
              dataKey="pm25"
              name="PM2.5"
              stroke="#39FF9A"
              strokeWidth={2}
              fill="url(#pm25Fill)"
              isAnimationActive={false}
              dot={false}
            />
            <Area
              yAxisId="pm"
              type="monotone"
              dataKey="pm10"
              name="PM10"
              stroke="#FFC857"
              strokeWidth={1.5}
              fill="transparent"
              isAnimationActive={false}
              dot={false}
            />
            <Area
              yAxisId="co2"
              type="monotone"
              dataKey="co2"
              name="CO₂"
              stroke="#38D9FF"
              strokeWidth={1.5}
              fill="transparent"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
