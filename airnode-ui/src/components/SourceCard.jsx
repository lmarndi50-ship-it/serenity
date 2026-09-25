import { SOURCES } from '../lib/labels'

const pct = (x) => `${Math.round(x * 100)}%`

export default function SourceCard({ source }) {
  const main = SOURCES[source.label] ?? source.label
  // Show confidence honestly. "Traffic 100%" reads as fake to judges.
  // TODO(you): when confidence < 0.5, say "Unclear — possibly X" instead.
  return (
    <section className="card">
      <h2>Likely source</h2>
      <div className="source-main">
        <strong>{main}</strong>
        <span>{pct(source.confidence)}</span>
      </div>
      <div className="bar">
        <div style={{ width: pct(source.confidence) }} />
      </div>
      {source.alternatives?.map((a) => (
        <div key={a.label} className="source-alt muted">
          <span>{SOURCES[a.label] ?? a.label}</span>
          <span>{pct(a.confidence)}</span>
        </div>
      ))}
    </section>
  )
}
