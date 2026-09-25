// Human-friendly names for the ids that come from the board.

export const POLLUTANTS = [
  { key: 'pm25', label: 'PM2.5', plain: 'fine dust', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', plain: 'coarse dust', unit: 'µg/m³' },
  { key: 'co', label: 'CO', plain: 'carbon monoxide', unit: 'ppm' },
  { key: 'co2', label: 'CO₂', plain: 'stale air', unit: 'ppm' },
  { key: 'no2', label: 'NO₂', plain: 'exhaust gas', unit: 'ppb' },
  { key: 'voc_index', label: 'VOC', plain: 'fumes & odours', unit: 'index' },
  { key: 'temp', label: 'Temp', plain: 'temperature', unit: '°C' },
  { key: 'humidity', label: 'Humidity', plain: 'humidity', unit: '%' },
]

export const SOURCES = {
  traffic: 'Traffic',
  garbage_burning: 'Garbage burning',
  construction_dust: 'Construction dust',
  cooking_smoke: 'Cooking smoke',
  crop_burning: 'Crop residue burning',
  clean: 'No major source',
}

export function pollutantLabel(key) {
  return POLLUTANTS.find((p) => p.key === key) ?? { label: key, plain: key, unit: '' }
}

export function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)} h ago`
}

export function clock(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
