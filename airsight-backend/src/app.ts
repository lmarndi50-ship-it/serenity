import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.js'
import readingsRouter from './routes/readings.js'
import forecastRouter from './routes/forecast.js'
import sourceRouter from './routes/source.js'
import advisoryRouter from './routes/advisory.js'
import nodesRouter from './routes/nodes.js'
import demoRouter from './routes/demo.js'
import ingestRouter from './routes/ingest.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
    }),
  )
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/readings', readingsRouter)
  app.use('/api/forecast', forecastRouter)
  app.use('/api/source', sourceRouter)
  app.use('/api/advisory', advisoryRouter)
  app.use('/api/nodes', nodesRouter)
  app.use('/api/demo', demoRouter)
  app.use('/api/ingest', ingestRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
