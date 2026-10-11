import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { stateStore, type TickEvent } from '../engine/stateStore.js'

function snapshotMessage() {
  return {
    type: 'snapshot' as const,
    history: stateStore.getHistory(),
    forecast: stateStore.getForecast(),
    source: stateStore.getSourceInference(),
    advisories: stateStore.getAdvisories(),
    mapNodes: stateStore.getMapNodeReadings(),
    demoState: stateStore.getDemoState(),
  }
}

function tickMessage(event: TickEvent) {
  return {
    type: 'tick' as const,
    reading: event.reading,
    demoState: event.demoState,
    forecast: stateStore.getForecast(),
    source: stateStore.getSourceInference(),
    advisories: stateStore.getAdvisories(),
    mapNodes: stateStore.getMapNodeReadings(),
  }
}

/**
 * Attaches a WebSocket server at /ws. Every connected client gets a full
 * `snapshot` on connect, then a `tick` message (new reading + every value
 * derived from it) each time the store advances — whether that advance
 * came from the simulator or a real hardware ingest.
 */
export function attachBroadcaster(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify(snapshotMessage()))
  })

  const onTick = (event: TickEvent) => {
    const payload = JSON.stringify(tickMessage(event))
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload)
    }
  }

  stateStore.on('tick', onTick)
  wss.on('close', () => stateStore.off('tick', onTick))

  return wss
}
