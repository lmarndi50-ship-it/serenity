import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORIES } from '../lib/aqi'
import { clock } from '../lib/labels'

// Fixed axis so the category bands sit in the same place on every render —
// that consistency is what lets someone learn "yellow = Moderate" over time,
// which an auto-scaling axis would undermine.
const Y_MAX = 500

// One ReferenceArea per CPCB category, each spanning from the previous
// category's ceiling up to its own. `fillOpacity` is tuned low enough that
// the measured/forecast line stays the thing your eye follows (the bands
// are context, not the headline) but high enough to read as distinct tiers
// in dark mode — checked against both, since a value that looks right on a
// light surface can turn muddy on a dark one.
const BANDS = CATEGORIES.map((cat, i) => ({
  y1: i === 0 ? 0 : CATEGORIES[i - 1].max,
  y2: cat.max,
  color: cat.color,
}))

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
  return (
    <section className="card">
      <h2>AQI now and next 6 hours</h2>
      <div className="chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            {BANDS.map((b) => (
              <ReferenceArea key={b.y2} y1={b.y1} y2={b.y2} fill={b.color} fillOpacity={0.22} stroke="none" ifOverflow="visible" />
            ))}
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--grid)" minTickGap={24} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--grid)" domain={[0, Y_MAX]} />
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
