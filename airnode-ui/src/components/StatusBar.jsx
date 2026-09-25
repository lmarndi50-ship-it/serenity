import { timeAgo } from '../lib/labels'

function Light({ on, onText, offText }) {
  return (
    <span className={`light ${on ? 'on' : 'off'}`}>
      <i aria-hidden="true" /> {on ? onText : offText}
    </span>
  )
}

// Two separate lights on purpose:
//  - Board link: is this page connected to the UNO Q?
//  - Internet sync: is the UNO Q connected to the internet?
// "No internet, still classifying" is the point of the whole project.
export default function StatusBar({ latest, boardConnected, isMock }) {
  const s = latest?.status
  return (
    <header className="statusbar">
      <strong className="brand">AirNode</strong>
      <Light on={boardConnected} onText="Board linked" offText="Board unreachable" />
      {s && <Light on={s.online} onText="Internet: synced" offText="Internet: offline" />}
      {s && !s.online && <span className="muted">{s.buffered_records} records waiting to sync</span>}
      {s && <span className="muted">Power: {s.power}</span>}
      {s && <span className="muted">Last sync {timeAgo(s.last_sync)}</span>}
      {isMock && <span className="mock-badge">MOCK DATA</span>}
    </header>
  )
}
