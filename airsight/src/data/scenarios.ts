import type { Reading, ScenarioId, SourceSignature } from '@/types'

export interface ScenarioProfile {
  id: ScenarioId
  label: string
  description: string
  /** target reading the simulator eases toward while this scenario is active */
  target: Omit<Reading, 'timestamp'>
  volatility: number
}

export const BASELINE: Omit<Reading, 'timestamp'> = {
  pm25: 32,
  pm10: 54,
  co: 0.6,
  co2: 560,
  no2: 18,
  voc: 90,
  temp: 27.5,
  humidity: 58,
}

export const SCENARIOS: Record<ScenarioId, ScenarioProfile> = {
  normal: {
    id: 'normal',
    label: 'Normal Day',
    description: 'Baseline ambient conditions across the campus node network.',
    target: BASELINE,
    volatility: 0.05,
  },
  traffic: {
    id: 'traffic',
    label: 'Heavy Traffic',
    description: 'Rush-hour vehicle congestion near the main road sensor.',
    target: { ...BASELINE, pm25: 96, pm10: 88, co: 2.4, no2: 58, co2: 640 },
    volatility: 0.09,
  },
  construction: {
    id: 'construction',
    label: 'Construction Dust',
    description: 'Earthwork and demolition activity raising coarse particulates.',
    target: { ...BASELINE, pm10: 168, pm25: 78, voc: 110 },
    volatility: 0.08,
  },
  cooking: {
    id: 'cooking',
    label: 'Cooking Smoke',
    description: 'Kitchen exhaust emissions from a nearby canteen.',
    target: { ...BASELINE, pm25: 84, voc: 240, co: 1.8, humidity: 66 },
    volatility: 0.1,
  },
  burning: {
    id: 'burning',
    label: 'Garbage Burning',
    description: 'Open waste burning detected upwind of the node.',
    target: { ...BASELINE, pm25: 142, co: 3.6, voc: 200, no2: 30 },
    volatility: 0.12,
  },
}

export const SOURCE_SIGNATURES: SourceSignature[] = [
  {
    id: 'traffic',
    label: 'Traffic',
    pollutants: [
      { key: 'pm25', direction: 'up' },
      { key: 'no2', direction: 'up' },
      { key: 'co', direction: 'up' },
    ],
  },
  {
    id: 'construction',
    label: 'Construction Dust',
    pollutants: [
      { key: 'pm10', direction: 'up' },
      { key: 'pm25', direction: 'up' },
    ],
  },
  {
    id: 'cooking',
    label: 'Cooking Smoke',
    pollutants: [
      { key: 'voc', direction: 'up' },
      { key: 'pm25', direction: 'up' },
      { key: 'co', direction: 'up' },
    ],
  },
  {
    id: 'burning',
    label: 'Garbage Burning',
    pollutants: [
      { key: 'pm25', direction: 'up' },
      { key: 'co', direction: 'up' },
      { key: 'voc', direction: 'up' },
    ],
  },
  {
    id: 'cropBurning',
    label: 'Crop Burning',
    pollutants: [
      { key: 'pm25', direction: 'up' },
      { key: 'pm10', direction: 'up' },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    pollutants: [],
  },
]
