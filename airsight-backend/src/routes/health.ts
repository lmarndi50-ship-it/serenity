import { Router } from 'express'
import { stateStore } from '../engine/stateStore.js'

const router = Router()

router.get('/', (_req, res) => {
  const demoState = stateStore.getDemoState()
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    dataSource: demoState.dataSource,
    lastUpdateTs: demoState.lastUpdateTs,
  })
})

export default router
