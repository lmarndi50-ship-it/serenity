import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useAirSight } from '@/hooks/useAirSightState'
import { formatClock } from '@/utils/format'

export function ForecastChart() {
  const { history, forecast } = useAirSight()

  const data = useMemo(() => {
    const recent = history.slice(-12).map((r) => ({
      label: formatClock(r.timestamp),
      observed: r.pm25,
      predicted: null as number | null,
    }))
    const bridgeIndex = recent.length - 1
    recent[bridgeIndex] = { ...recent[bridgeIndex], predicted: recent[bridgeIndex].observed }

    const future = forecast.slice(1).map((f) => ({
      label: f.label,
      observed: null as number | null,
      predicted: f.pm25,
    }))

    return [...recent, ...future]
  }, [history, forecast])

  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.15)"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={36} />
          <Tooltip
            contentStyle={{
              background: 'rgba(13,31,27,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          />
          <Line
            type="monotone"
            dataKey="observed"
            name="Observed PM2.5"
            stroke="#39FF9A"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted PM2.5"
            stroke="#38D9FF"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            dot={{ r: 3 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
