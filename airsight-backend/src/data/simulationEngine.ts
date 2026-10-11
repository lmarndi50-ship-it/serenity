import type { ForecastPoint, Reading, ScenarioId, SourceInference } from '../types/index.js'
import { BASELINE, SCENARIOS, SOURCE_SIGNATURES } from './scenarios.js'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const gaussianNoise = () => {
  // Box-Muller, cheap approximation is fine for cosmetic sensor jitter
  const u = Math.random() || 1e-6
  const v = Math.random() || 1e-6
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const numericKeys = Object.keys(BASELINE) as Array<keyof typeof BASELINE>

const bounds: Record<keyof typeof BASELINE, [number, number]> = {
  pm25: [4, 260],
  pm10: [8, 400],
  co: [0.1, 8],
  co2: [380, 1400],
  no2: [2, 120],
  voc: [10, 400],
  temp: [18, 40],
  humidity: [20, 95],
}

export function nextReading(prev: Reading, scenarioId: ScenarioId, timestamp: number): Reading {
  const { target, volatility } = SCENARIOS[scenarioId]
  const next: Partial<Reading> = { timestamp }

  for (const key of numericKeys) {
    const current = prev[key]
    const goal = target[key]
    const pull = 0.14 + Math.random() * 0.06
    const noiseScale = Math.max(0.5, goal * volatility)
    const eased = current + (goal - current) * pull + gaussianNoise() * noiseScale * 0.35
    const [min, max] = bounds[key]
    next[key] = Number(clamp(eased, min, max).toFixed(key === 'co' ? 2 : 1))
  }

  return next as Reading
}

export function seedHistory(scenarioId: ScenarioId, points: number, stepMs: number): Reading[] {
  const now = Date.now()
  const history: Reading[] = []
  let cursor: Reading = { timestamp: now - points * stepMs, ...BASELINE }

  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - i) * stepMs
    // ease into the target profile over the back half of the window so the
    // chart visibly shows the onset of the current scenario
    const onset = i / points
    const blended: ScenarioId = onset > 0.55 ? scenarioId : 'normal'
    cursor = nextReading(cursor, blended, timestamp)
    history.push(cursor)
  }

  return history
}

export function generateForecast(history: Reading[], scenarioId: ScenarioId): ForecastPoint[] {
  const recent = history.slice(-12)
  const avgPm25 = recent.reduce((sum, r) => sum + r.pm25, 0) / recent.length
  const first = recent[0]?.pm25 ?? avgPm25
  const last = recent[recent.length - 1]?.pm25 ?? avgPm25
  const trend = (last - first) / Math.max(1, recent.length)

  const scenario = SCENARIOS[scenarioId]
  const drift = (scenario.target.pm25 - last) * 0.18

  const points: ForecastPoint[] = [{ label: 'NOW', hoursFromNow: 0, pm25: Math.round(last), observed: true }]

  let cursor = last
  for (let h = 1; h <= 4; h++) {
    cursor = cursor + trend * 2.4 + drift * (h === 1 ? 1 : 0.4) + gaussianNoise() * 2.2
    cursor = clamp(cursor, 4, 320)
    points.push({ label: `${h}H`, hoursFromNow: h, pm25: Math.round(cursor), observed: false })
  }

  return points
}

export function classifySource(current: Reading): SourceInference {
  const baseline = BASELINE
  const scored = SOURCE_SIGNATURES.map((source) => {
    if (source.pollutants.length === 0) {
      return { source, raw: 0.18 }
    }
    let score = 0
    for (const p of source.pollutants) {
      const delta = (current[p.key] - baseline[p.key]) / baseline[p.key]
      score += Math.max(0, delta)
    }
    return { source, raw: score / source.pollutants.length }
  })

  const total = scored.reduce((sum, s) => sum + s.raw, 0) || 1
  const ranked = scored
    .map((s) => ({ source: s.source, confidence: Math.round((s.raw / total) * 100) }))
    .sort((a, b) => b.confidence - a.confidence)

  return { source: ranked[0]!.source, confidence: ranked[0]!.confidence, ranked }
}
