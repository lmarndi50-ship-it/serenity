import { useState } from 'react'
import StatusBar from './components/StatusBar'
import { useNodeData } from './data/useNodeData'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'

export default function App() {
  const { latest, history, nodes, boardConnected, isMock } = useNodeData()
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="app">
      <StatusBar latest={latest} boardConnected={boardConnected} isMock={isMock} />

      {!boardConnected && latest && (
        <div className="banner">Lost connection to the node. Showing data from {new Date(latest.ts).toLocaleTimeString('en-IN')}; reconnecting…</div>
      )}

      <nav className="tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>This node</button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>Campus map</button>
      </nav>

      <main>
        {!latest ? (
          <p className="muted">Waiting for the first reading from the node…</p>
        ) : tab === 'dashboard' ? (
          <Dashboard latest={latest} history={history} />
        ) : (
          <MapPage nodes={nodes} />
        )}
      </main>
    </div>
  )
}
