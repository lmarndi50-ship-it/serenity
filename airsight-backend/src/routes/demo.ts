import { Router } from 'express'
import { z } from 'zod'
import { stateStore } from '../engine/stateStore.js'

const router = Router()

const scenarioSchema = z.object({
  scenario: z.enum(['normal', 'traffic', 'construction', 'cooking', 'burning']),
})

const networkSchema = z.object({ online: z.boolean() })
const aiSchema = z.object({ enabled: z.boolean() })

router.get('/state', (_req, res) => {
  res.json(stateStore.getDemoState())
})

router.post('/scenario', (req, res) => {
  const { scenario } = scenarioSchema.parse(req.body)
  stateStore.setScenario(scenario)
  res.json(stateStore.getDemoState())
})

router.post('/network', (req, res) => {
  const { online } = networkSchema.parse(req.body)
  stateStore.setNetworkOnline(online)
  res.json(stateStore.getDemoState())
})

router.post('/ai', (req, res) => {
  const { enabled } = aiSchema.parse(req.body)
  stateStore.setAiEnabled(enabled)
  res.json(stateStore.getDemoState())
})

export default router
