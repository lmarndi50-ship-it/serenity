export type ScenarioId =
  | 'normal'
  | 'traffic'
  | 'construction'
  | 'cooking'
  | 'burning'

export type AqiBand = 'good' | 'moderate' | 'unhealthy' | 'critical'

export type SourceId =
  | 'traffic'
  | 'construction'
  | 'burning'
  | 'cooking'
  | 'cropBurning'
  | 'background'

export interface Reading {
  timestamp: number
  pm25: number
  pm10: number
  co: number
  co2: number
  no2: number
  voc: number
  temp: number
  humidity: number
}

export interface ForecastPoint {
  label: string
  hoursFromNow: number
  pm25: number
  observed: boolean
}

export interface SourceSignature {
  id: SourceId
  label: string
  pollutants: Array<{ key: keyof Omit<Reading, 'timestamp' | 'temp' | 'humidity'>; direction: 'up' | 'down' }>
}

export interface SourceInference {
  source: SourceSignature
  confidence: number
  ranked: Array<{ source: SourceSignature; confidence: number }>
}

export interface MapNode {
  id: string
  name: string
  x: number
  y: number
  scenario: ScenarioId
  offline?: boolean
}

export interface AdvisoryContent {
  id: string
  icon: string
  headline: string
  body: string
  action: string
  why: string[]
}
