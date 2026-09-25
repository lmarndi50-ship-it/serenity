import { categoryFor } from '../lib/aqi'
import { SOURCES } from '../lib/labels'

// Offline-safe map: nodes are dots on a static picture, positioned with
// percentages. No online map tiles (OpenStreetMap/Google need internet).
//
// The artwork is a placeholder schematic (public/campus-map.svg), not a
// surveyed site plan — replace that one file with your real campus/ward
// layout (a drone photo, a scanned floor plan, even a phone photo of a
// printed map) and every node's {x, y} percentage below still lines up,
// since positions are relative to the image bounds, not to this artwork's
// content.
//
// BASE_URL (not a literal '/campus-map.svg') because this app can be
// served from a sub-path — see the `base: './'` note in vite.config.js.
const CAMPUS_MAP_URL = `${import.meta.env.BASE_URL}campus-map.svg`

export default function NodeMap({ nodes }) {
  return (
    <section className="card">
      <h2>Campus map</h2>
      <div
        className="map"
        role="img"
        aria-label="Map of air quality nodes"
        style={{ backgroundImage: `url(${CAMPUS_MAP_URL})` }}
      >
        {nodes.map((n) => {
          const cat = categoryFor(n.aqi)
          return (
            <div
              key={n.node_id}
              className={`map-dot ${n.online ? '' : 'map-dot-offline'}`}
              style={{ left: `${n.x}%`, top: `${n.y}%`, '--cat': cat.color }}
              title={`${n.name}: AQI ${n.aqi} (${cat.name})`}
            >
              <span>{n.aqi}</span>
            </div>
          )
        })}
      </div>
      <p className="muted small map-caption">
        Illustrative layout — replace public/campus-map.svg with your real site plan.
      </p>
      <table className="node-table">
        <thead>
          <tr><th>Node</th><th>AQI</th><th>Likely source</th><th>Link</th></tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.node_id}>
              <td>{n.name}</td>
              <td>{n.aqi} · {categoryFor(n.aqi).name}</td>
              <td>{SOURCES[n.source] ?? n.source ?? '—'}</td>
              <td>{n.online ? 'Online' : 'Offline'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
