import { POLLUTANTS } from '../lib/labels'

function trend(history, key) {
  if (history.length < 5) return ''
  const now = history[history.length - 1].readings[key]
  const before = history[history.length - 5].readings[key]
  if (now == null || before == null) return ''
  const change = (now - before) / (before || 1)
  if (change > 0.05) return '↑'
  if (change < -0.05) return '↓'
  return '→'
}

export default function PollutantGrid({ readings, history }) {
  return (
    <section className="grid" aria-label="Sensor readings">
      {POLLUTANTS.map((p) => {
        const v = readings[p.key]
        const dead = v == null
        return (
          <div key={p.key} className={`tile ${dead ? 'tile-dead' : ''}`}>
            <div className="muted">{p.label}</div>
            {dead ? (
              <div className="tile-value tile-nodata">No data</div>
            ) : (
              <>
                <div className="tile-value">
                  {v} <span className="trend">{trend(history, p.key)}</span>
                </div>
                <div className="muted small">{p.unit}</div>
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}
