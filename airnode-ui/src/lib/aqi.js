// India National AQI (CPCB) helpers.
//
// The board is the source of truth for AQI: the UI shows `aqi` from the
// payload as-is. This table exists so the mock can produce realistic values
// and so the UI can colour things consistently. Give the same breakpoints to
// the backend team so both sides agree.

// `health` is CPCB's own "associated health impact" wording per category —
// keep it here, not in a component, since every screen that shows a
// category should say the same thing about it.
export const CATEGORIES = [
  { name: 'Good', max: 50, color: '#2e9e44', health: 'Minimal impact' },
  { name: 'Satisfactory', max: 100, color: '#8bbf3f', health: 'Minor breathing discomfort to sensitive people' },
  { name: 'Moderate', max: 200, color: '#e8c330', health: 'Breathing discomfort to people with lung, asthma or heart disease, children and older adults' },
  { name: 'Poor', max: 300, color: '#e8862e', health: 'Breathing discomfort to most people on prolonged exposure' },
  { name: 'Very Poor', max: 400, color: '#d63b3b', health: 'Respiratory illness on prolonged exposure' },
  { name: 'Severe', max: 500, color: '#8c1c2c', health: 'Affects healthy people, and seriously impacts those with existing disease' },
]

// [concentration low, concentration high, index low, index high], µg/m³
const BREAKPOINTS = {
  pm25: [[0, 30, 0, 50], [30, 60, 50, 100], [60, 90, 100, 200], [90, 120, 200, 300], [120, 250, 300, 400], [250, 500, 400, 500]],
  pm10: [[0, 50, 0, 50], [50, 100, 50, 100], [100, 250, 100, 200], [250, 350, 200, 300], [350, 430, 300, 400], [430, 600, 400, 500]],
}

// Linear interpolation inside the matching breakpoint band.
export function subIndex(pollutant, conc) {
  const bands = BREAKPOINTS[pollutant]
  if (!bands || conc == null) return null
  const band = bands.find(([, hi]) => conc <= hi) ?? bands[bands.length - 1]
  const [cLo, cHi, iLo, iHi] = band
  return Math.round(((iHi - iLo) / (cHi - cLo)) * (Math.min(conc, cHi) - cLo) + iLo)
}

// Overall AQI is the worst sub-index. The real CPCB method uses 24h averages
// and more pollutants; this is only good enough for a mock.
export function computeAqi(readings) {
  const subs = Object.keys(BREAKPOINTS)
    .map((p) => ({ p, v: subIndex(p, readings[p]) }))
    .filter((s) => s.v != null)
  const worst = subs.reduce((a, b) => (b.v > a.v ? b : a))
  return { value: worst.v, category: categoryFor(worst.v).name, dominant: worst.p }
}

export function categoryFor(aqi) {
  return CATEGORIES.find((c) => aqi <= c.max) ?? CATEGORIES[CATEGORIES.length - 1]
}
