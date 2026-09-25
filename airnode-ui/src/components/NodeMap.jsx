import { categoryFor } from '../lib/aqi'
import { SOURCES } from '../lib/labels'

// Offline-safe map: nodes are dots on a static picture, positioned with
// percentages. No online map tiles (OpenStreetMap/Google need internet).
//
// TODO(you): put a campus/ward floor plan at public/campus.png and set it as
// the background of .map in index.css. Measure each node's x/y (%) on it.
export default function NodeMap({ nodes }) {
  return (
    <section className="card">
      <h2>Campus map</h2>
      <div className="map" role="img" aria-label="Map of air quality nodes">
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
