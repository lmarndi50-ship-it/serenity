import NodeMap from '../components/NodeMap'

export default function MapPage({ nodes }) {
  if (!nodes.length) return <p className="muted">No other nodes reported yet.</p>
  return <NodeMap nodes={nodes} />
}
