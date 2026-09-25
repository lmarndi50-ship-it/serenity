import { categoryFor } from '../lib/aqi'
import { pollutantLabel } from '../lib/labels'

export default function AqiHero({ aqi }) {
  const cat = categoryFor(aqi.value)
  const dominant = pollutantLabel(aqi.dominant)
  // TODO(you): add a one-line health note per category
  // (e.g. Poor → "Breathing discomfort for most people on long exposure").
  return (
    <section className="card aqi-hero" style={{ '--cat': cat.color }}>
      <div className="aqi-number">{aqi.value}</div>
      <div>
        <div className="aqi-category">{aqi.category}</div>
        <div className="muted">
          Mostly {dominant.plain} ({dominant.label})
        </div>
      </div>
    </section>
  )
}
