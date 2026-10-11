import { Router } from 'express'
import { stateStore } from '../engine/stateStore.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json(stateStore.getForecast())
})

export default router
