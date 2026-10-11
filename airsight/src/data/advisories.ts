import type { AdvisoryContent, Reading, ScenarioId, SourceId } from '@/types'

export function buildAdvisories(scenario: ScenarioId, sourceId: SourceId, reading: Reading): AdvisoryContent[] {
  const list: AdvisoryContent[] = []

  if (scenario === 'traffic' || sourceId === 'traffic') {
    list.push({
      id: 'outdoor',
      icon: 'Route',
      headline: 'Traffic-related pollution rising near the main road',
      body: 'PM2.5 and NO₂ are elevated along the main road sensor corridor.',
      action: 'Take the alternate walking route through the east side of campus.',
      why: [`PM2.5 ${reading.pm25.toFixed(0)} µg/m³ ↑`, `NO₂ ${reading.no2.toFixed(0)} ppb ↑`, 'Traffic signature detected'],
    })
  }

  if (scenario === 'construction' || sourceId === 'construction') {
    list.push({
      id: 'windows',
      icon: 'ShieldAlert',
      headline: 'Coarse dust from nearby construction activity',
      body: 'PM10 has risen sharply while gas-phase pollutants stay near baseline.',
      action: 'Keep windows closed on the construction-facing side of the building.',
      why: [`PM10 ${reading.pm10.toFixed(0)} µg/m³ ↑`, 'Coarse-particle signature detected'],
    })
  }

  if (scenario === 'cooking' || sourceId === 'cooking') {
    list.push({
      id: 'kitchen',
      icon: 'Fan',
      headline: 'Cooking-related VOCs building up indoors',
      body: 'VOC and PM2.5 levels indicate active cooking emissions nearby.',
      action: 'Turn on the exhaust fan while cooking and for 10 minutes after.',
      why: [`VOC index ${reading.voc.toFixed(0)} ↑`, `PM2.5 ${reading.pm25.toFixed(0)} µg/m³ ↑`],
    })
  }

  if (scenario === 'burning' || sourceId === 'burning') {
    list.push({
      id: 'outdoor-burning',
      icon: 'AlertTriangle',
      headline: 'Open burning detected upwind of this node',
      body: 'PM2.5, CO and VOC are all elevated together, consistent with combustion of mixed waste.',
      action: 'Move outdoor activity indoors until levels return to baseline.',
      why: [`PM2.5 ${reading.pm25.toFixed(0)} µg/m³ ↑`, `CO ${reading.co.toFixed(1)} ppm ↑`, 'Combustion signature detected'],
    })
  }

  if (reading.co2 > 900) {
    list.push({
      id: 'ventilation',
      icon: 'Wind',
      headline: 'Indoor CO₂ accumulating from occupancy',
      body: 'Outdoor air quality is currently better than the indoor reading.',
      action: 'Open windows on the courtyard side to ventilate the room.',
      why: [`Indoor CO₂ ${reading.co2.toFixed(0)} ppm`, 'Outdoor PM2.5 within normal range'],
    })
  }

  if (list.length === 0) {
    list.push({
      id: 'normal',
      icon: 'CheckCircle2',
      headline: 'Air quality is within normal range',
      body: 'No elevated pollution signature detected across the sensor array.',
      action: 'No action needed — continue normal outdoor activity.',
      why: [`PM2.5 ${reading.pm25.toFixed(0)} µg/m³`, `AQI band: good`],
    })
  }

  return list
}
