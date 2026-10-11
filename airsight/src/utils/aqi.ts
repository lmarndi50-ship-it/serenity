import type { AqiBand, Reading } from '@/types'

/**
 * Simplified composite index for the demo UI (not the official CPCB/EPA AQI
 * formula). Weighted from the pollutants the node actually measures.
 */
export function compositeIndex(reading: Reading): number {
  const score =
    reading.pm25 * 1.0 +
    reading.pm10 * 0.35 +
    reading.no2 * 0.6 +
    reading.co * 8 +
    reading.voc * 0.12
  return Math.round(score / 2.4)
}

export function bandForIndex(index: number): AqiBand {
  if (index <= 50) return 'good'
  if (index <= 100) return 'moderate'
  if (index <= 180) return 'unhealthy'
  return 'critical'
}

export const BAND_META: Record<AqiBand, { label: string; color: string; description: string }> = {
  good: { label: 'GOOD', color: 'var(--color-accent-emerald)', description: 'Air quality is satisfactory.' },
  moderate: { label: 'MODERATE', color: 'var(--color-warning)', description: 'Acceptable, but sensitive groups should take care.' },
  unhealthy: { label: 'UNHEALTHY', color: 'var(--color-unhealthy)', description: 'Everyone may begin to notice effects.' },
  critical: { label: 'CRITICAL', color: 'var(--color-danger)', description: 'Health warning of emergency conditions.' },
}

export function bandForPm(value: number, thresholds: [number, number, number]): AqiBand {
  if (value <= thresholds[0]) return 'good'
  if (value <= thresholds[1]) return 'moderate'
  if (value <= thresholds[2]) return 'unhealthy'
  return 'critical'
}

export function dominantPollutant(reading: Reading): 'PM2.5' | 'PM10' | 'VOC' | 'CO' | 'NO2' {
  const ratios: Array<[string, number]> = [
    ['PM2.5', reading.pm25 / 35],
    ['PM10', reading.pm10 / 70],
    ['VOC', reading.voc / 150],
    ['CO', reading.co / 2],
    ['NO2', reading.no2 / 40],
  ]
  ratios.sort((a, b) => b[1] - a[1])
  return ratios[0][0] as 'PM2.5' | 'PM10' | 'VOC' | 'CO' | 'NO2'
}

export const METRIC_THRESHOLDS = {
  pm25: [35, 75, 150] as [number, number, number],
  pm10: [70, 150, 250] as [number, number, number],
  co2: [800, 1200, 2000] as [number, number, number],
  voc: [150, 250, 350] as [number, number, number],
}
