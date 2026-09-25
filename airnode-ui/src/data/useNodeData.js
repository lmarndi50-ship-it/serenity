// The ONLY place in the app that knows where data comes from.
// Components receive plain payloads (see DATA_CONTRACT.md) and never import
// socket.io or the mock directly — that is what lets you build the whole UI
// before the hardware works.

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { nextMockReading, mockNodes } from './mockNode'

const USE_MOCK = import.meta.env.VITE_MOCK === '1'
const MOCK_INTERVAL_MS = 1500
const HISTORY_LIMIT = 360

function seedMockHistory() {
  if (!USE_MOCK) return []
  // Pre-fill so the chart isn't empty on first render.
  return Array.from({ length: 30 }, () => nextMockReading())
}

export function useNodeData() {
  const [history, setHistory] = useState(seedMockHistory)
  const [nodes, setNodes] = useState([])
  const [socketUp, setSocketUp] = useState(false)

  useEffect(() => {
    const push = (payload) => setHistory((h) => [...h.slice(-HISTORY_LIMIT + 1), payload])

    if (USE_MOCK) {
      const timer = setInterval(() => {
        const payload = nextMockReading()
        push(payload)
        setNodes(mockNodes(payload))
      }, MOCK_INTERVAL_MS)
      return () => clearInterval(timer)
    }

    // Real board. io() with no URL connects to the host that served the page,
    // which is the UNO Q once deployed (and the Vite proxy during dev).
    const socket = io()
    socket.on('connect', () => setSocketUp(true))
    socket.on('disconnect', () => setSocketUp(false))
    // TODO(you): confirm these event names with the backend team.
    socket.on('reading', push)
    socket.on('nodes', setNodes)

    // TODO(you): ask the backend for GET /api/history?hours=6 so a page
    // refresh doesn't start with an empty chart. Then:
    // fetch('./api/history?hours=6').then((r) => r.json()).then(setHistory).catch(() => {})

    return () => socket.disconnect()
  }, [])

  const latest = history[history.length - 1] ?? null
  return {
    latest,
    history,
    nodes,
    // "Board link": is this page still talking to the board? Different from
    // latest.status.online, which is the board's own internet connection.
    boardConnected: USE_MOCK || socketUp,
    isMock: USE_MOCK,
  }
}
