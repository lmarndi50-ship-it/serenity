import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { stateStore } from '../engine/stateStore.js'
import { ApiError } from '../middleware/errorHandler.js'

const router = Router()

const readingPayloadSchema = z.object({
  pm25: z.number().finite(),
  pm10: z.number().finite(),
  co: z.number().finite(),
  co2: z.number().finite(),
  no2: z.number().finite(),
  voc: z.number().finite(),
  temp: z.number().finite(),
  humidity: z.number().finite(),
})

/**
 * Where a real Arduino UNO Q (or a gateway relaying its serial/MQTT output)
 * pushes an actual sensor reading. Once one arrives, the state store stops
 * synthesizing data and serves this reading (and everything derived from
 * it — forecast, source classification, advisories) instead, falling back
 * to the simulator automatically if hardware goes quiet.
 */
router.post('/reading', (req, res) => {
  if (!config.ingestApiKey) {
    throw new ApiError(503, 'Ingest is disabled: set INGEST_API_KEY in the environment to enable it.')
  }
  if (req.header('x-ingest-key') !== config.ingestApiKey) {
    throw new ApiError(401, 'Missing or invalid x-ingest-key header.')
  }

  const payload = readingPayloadSchema.parse(req.body)
  const reading = stateStore.ingestReading(payload)
  res.status(201).json(reading)
})

export default router
