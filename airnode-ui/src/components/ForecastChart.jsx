import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { clock } from '../lib/labels'

// One measure (AQI), two styles: solid = measured, dashed = predicted.
// Same colour because it is the same thing; the dash is what says "guess".
export default function ForecastChart({ history, forecast }) {
  const recent = history.slice(-30)
  const nowLabel = recent.length ? clock(recent[recent.length - 1].ts) : ''

  const data = [
    ...recent.map((h, i) => ({
      t: clock(h.ts),
      measured: h.aqi.value,
      // Join the two lines at "now" so there is no gap between them.
      predicted: i === recent.length - 1 ? h.aqi.value : null,
    })),
    ...forecast.map((f) => ({ t: clock(f.ts), predicted: f.aqi })),
  ]

  // TODO(you): the x-axis is a list of labels, not a real time scale, so
  // it only looks right if points are evenly spaced. Ask the backend for one
  // averaged point per 10 min of history (the mock already does this).
  // TODO(you): shade the background by AQI category band (ReferenceArea).
  return (
    <section className="card">
      <h2>AQI now and next 6 hours</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--grid)" minTickGap={24} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--grid)" domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--grid)', color: 'var(--ink)' }}
              formatter={(v, name) => [v, name === 'measured' ? 'Measured AQI' : 'Forecast AQI']}
            />
            <Legend formatter={(name) => (name === 'measured' ? 'Measured' : 'Forecast')} />
            <ReferenceLine x={nowLabel} stroke="var(--muted)" strokeDasharray="2 2" label={{ value: 'Now', position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 11 }} />
            <Line dataKey="measured" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="predicted" stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
