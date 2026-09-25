// Fake board. Produces payloads in exactly the shape described in
// DATA_CONTRACT.md, so no component can tell mock from real.
//
// It replays a scripted sequence of situations instead of random noise,
// which is also what you want for a live demo: real air in a hall is boring.

import { computeAqi } from '../lib/aqi'

const PHASES = [
  { source: 'clean', ticks: 20, target: { pm25: 22, pm10: 40, co: 0.4, co2: 450, no2: 12, voc_index: 90 } },
  { source: 'traffic', ticks: 30, target: { pm25: 85, pm10: 150, co: 2.2, co2: 520, no2: 60, voc_index: 160 } },
  { source: 'garbage_burning', ticks: 30, target: { pm25: 160, pm10: 230, co: 3.5, co2: 500, no2: 30, voc_index: 320 } },
  { source: 'clean', ticks: 25, target: { pm25: 35, pm10: 70, co: 0.6, co2: 470, no2: 18, voc_index: 110 } },
]

const ALTERNATIVES = {
  clean: ['cooking_smoke', 'traffic'],
  traffic: ['construction_dust', 'garbage_burning'],
  garbage_burning: ['crop_burning', 'cooking_smoke'],
}

// Simulated clock: each mock reading is 10 minutes after the previous one,
// so a demo covers a whole morning in a couple of minutes.
const SIM_STEP_MS = 10 * 60e3

const state = {
  tick: 0,
  simTime: Date.now() - 30 * SIM_STEP_MS,
  readings: { ...PHASES[0].target, temp: 30, humidity: 60 },
  online: true,
  buffered: 0,
  lastSync: new Date().toISOString(),
}

function phaseAt(tick) {
  const total = PHASES.reduce((n, p) => n + p.ticks, 0)
  let t = tick % total
  for (let i = 0; i < PHASES.length; i++) {
    if (t < PHASES[i].ticks) return { phase: PHASES[i], next: PHASES[(i + 1) % PHASES.length], progress: t / PHASES[i].ticks }
    t -= PHASES[i].ticks
  }
}

const drift = (cur, target, rate = 0.15) => cur + (target - cur) * rate + (Math.random() - 0.5) * target * 0.05
const round1 = (x) => Math.round(x * 10) / 10

function adviceFor(aqi, source) {
  // TODO(you): this is the "advisory layer". On the real board it comes from
  // the backend; here it only needs to look plausible. Make the text
  // specific (a time, a place, an object in the room) — vague advice is noise.
  if (source === 'garbage_burning') {
    return [
      { text: 'Smoke nearby — keep windows shut and switch on the exhaust fan', priority: 'high' },
      { text: 'Move outdoor PE / play indoors for the next 2 hours', priority: 'high' },
    ]
  }
  if (source === 'traffic' && aqi.value > 100) {
    return [
      { text: 'Walk via the inner lane instead of the main road', priority: 'medium' },
      { text: 'Open windows after 11:00 when traffic eases', priority: 'low' },
    ]
  }
  if (aqi.value <= 100) return [{ text: 'Good time to open windows and air out rooms', priority: 'low' }]
  return [{ text: 'Limit long outdoor exertion today', priority: 'medium' }]
}

export function nextMockReading(nodeId = 'node-01') {
  state.tick++
  state.simTime += SIM_STEP_MS
  const { phase, next, progress } = phaseAt(state.tick)

  for (const [k, target] of Object.entries(phase.target)) state.readings[k] = drift(state.readings[k], target)
  state.readings.temp = drift(state.readings.temp, 31, 0.05)
  state.readings.humidity = drift(state.readings.humidity, 62, 0.05)
  const readings = Object.fromEntries(Object.entries(state.readings).map(([k, v]) => [k, round1(v)]))

  // Go "offline" for a while every so often so the offline UI gets exercised.
  if (state.tick % 40 === 0) state.online = !state.online
  if (state.online) {
    state.buffered = 0
    state.lastSync = new Date().toISOString()
  } else {
    state.buffered += 1
  }

  const aqi = computeAqi(readings)

  // Crude forecast: slide from now towards the next phase's level.
  const nextAqi = computeAqi(next.target).value
  const forecast = Array.from({ length: 6 }, (_, i) => {
    const w = Math.min(1, progress + (i + 1) * 0.2)
    return {
      ts: new Date(state.simTime + (i + 1) * 3600e3).toISOString(),
      aqi: Math.round(aqi.value * (1 - w) + nextAqi * w),
    }
  })

  const confidence = round1(0.55 + Math.min(progress, 1) * 0.35)
  const [alt1, alt2] = ALTERNATIVES[phase.source] ?? []

  return {
    node_id: nodeId,
    ts: new Date(state.simTime).toISOString(),
    readings,
    aqi,
    forecast,
    source: {
      label: phase.source,
      confidence,
      alternatives: [
        { label: alt1, confidence: round1((1 - confidence) * 0.7) },
        { label: alt2, confidence: round1((1 - confidence) * 0.3) },
      ].filter((a) => a.label),
    },
    advice: adviceFor(aqi, phase.source),
    status: {
      online: state.online,
      last_sync: state.lastSync,
      power: state.tick % 90 > 70 ? 'battery' : 'mains',
      buffered_records: state.buffered,
    },
  }
}

// Other nodes on the campus map. Positions are percentages of the map image.
const OTHER_NODES = [
  { node_id: 'node-02', name: 'Main gate', x: 18, y: 78, offset: 1.4 },
  { node_id: 'node-03', name: 'Canteen', x: 62, y: 40, offset: 1.1 },
  { node_id: 'node-04', name: 'Library', x: 40, y: 22, offset: 0.6 },
  { node_id: 'node-05', name: 'Back lane', x: 85, y: 70, offset: 1.8 },
]

export function mockNodes(primary) {
  const base = primary?.aqi.value ?? 80
  return [
    { node_id: primary?.node_id ?? 'node-01', name: 'Classroom block', x: 45, y: 58, aqi: base, source: primary?.source.label, online: true },
    ...OTHER_NODES.map((n) => ({
      ...n,
      aqi: Math.round(base * n.offset),
      source: n.offset > 1.3 ? 'traffic' : primary?.source.label,
      online: n.node_id !== 'node-05',
    })),
  ]
}
