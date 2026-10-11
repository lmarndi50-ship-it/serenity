import { createServer } from 'node:http'
import { createApp } from './app.js'
import { attachBroadcaster } from './ws/broadcaster.js'
import { stateStore } from './engine/stateStore.js'
import { config } from './config.js'

const app = createApp()
const httpServer = createServer(app)
attachBroadcaster(httpServer)

stateStore.start()

httpServer.listen(config.port, () => {
  console.log(`AIRSIGHT backend listening on http://localhost:${config.port}`)
  console.log(`WebSocket live feed at ws://localhost:${config.port}/ws`)
  if (!config.ingestApiKey) {
    console.warn('INGEST_API_KEY is not set — POST /api/ingest/reading will reject every request until it is.')
  }
})

function shutdown(): void {
  stateStore.stop()
  httpServer.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
