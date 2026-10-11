import { Router } from 'express'
import { z } from 'zod'
import { stateStore } from '../engine/stateStore.js'
import type { TimeRange } from '../engine/stateStore.js'

const router = Router()

const rangeSchema = z.enum(['1H', '6H', '12H', '24H']).default('6H')

router.get('/current', (_req, res) => {
  res.json(stateStore.getCurrentReading())
})

router.get('/history', (req, res) => {
  const range = rangeSchema.parse(req.query.range) as TimeRange
  res.json(stateStore.getHistory(range))
})

export default router
