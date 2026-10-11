import { EventEmitter } from 'node:events'
import { config } from '../config.js'
import { seedHistory, nextReading, generateForecast, classifySource } from '../data/simulationEngine.js'
import { buildAdvisories } from '../data/advisories.js'
import { MAP_NODES } from '../data/nodes.js'
import { bandForPm, METRIC_THRESHOLDS } from '../utils/aqi.js'
import type {
  AdvisoryContent,
  DataSource,
  DemoState,
  ForecastPoint,
  IngestPayload,
  MapNodeReading,
  Reading,
  ScenarioId,
  SourceInference,
} from '../types/index.js'

export type TimeRange = '1H' | '6H' | '12H' | '24H'

const RANGE_POINTS: Record<TimeRange, number> = {
  '1H': 12,
  '6H': 72,
  '12H': 144,
  '24H': 288,
}

export interface TickEvent {
  reading: Reading
  demoState: DemoState
}

/**
 * Single in-process source of truth for AIRSIGHT's live data.
 *
 * Normally it drives itself with the same scenario-based simulator the
 * frontend used to run client-side. When a real Arduino UNO Q (or a
 * gateway relaying it) calls `ingestReading`, the store switches to
 * `dataSource: 'hardware'` and stops synthesizing readings — it only
 * resumes simulating if no real reading arrives within
 * `config.hardwareStaleMs`, so a disconnected node degrades gracefully
 * back to the demo instead of freezing or crashing.
 */
class AirSightStateStore extends EventEmitter {
  private history: Reading[]
  private scenario: ScenarioId = 'normal'
  private networkOnline = true
  private aiEnabled = true
  private dataSource: DataSource = 'simulated'
  private lastHardwareTs: number | null = null
  private totalReadingsLogged = 24_381
  private lastUpdateTs = Date.now()
  private tickHandle: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.history = seedHistory(this.scenario, config.historyPoints, config.stepMs)
  }

  start(): void {
    if (this.tickHandle) return
    this.tickHandle = setInterval(() => this.tick(), config.tickMs)
  }

  stop(): void {
    if (this.tickHandle) clearInterval(this.tickHandle)
    this.tickHandle = null
  }

  private hardwareIsFresh(): boolean {
    return this.dataSource === 'hardware' && this.lastHardwareTs !== null && Date.now() - this.lastHardwareTs < config.hardwareStaleMs
  }

  private tick(): void {
    if (this.hardwareIsFresh()) {
      // Real sensor data is current; the simulator stays paused and lets
      // ingestReading() drive updates instead.
      return
    }

    if (this.dataSource === 'hardware' && !this.hardwareIsFresh()) {
      this.dataSource = 'simulated'
    }

    const last = this.history[this.history.length - 1]!
    const reading = nextReading(last, this.scenario, last.timestamp + config.stepMs)
    this.pushReading(reading)
  }

  private pushReading(reading: Reading): void {
    this.history = [...this.history.slice(1), reading]
    this.totalReadingsLogged += 1
    this.lastUpdateTs = Date.now()
    this.emit('tick', { reading, demoState: this.getDemoState() } satisfies TickEvent)
  }

  /** Called by the hardware ingest endpoint with a real sensor reading. */
  ingestReading(payload: IngestPayload): Reading {
    const now = Date.now()
    this.dataSource = 'hardware'
    this.lastHardwareTs = now
    const reading: Reading = { ...payload, timestamp: now }
    this.pushReading(reading)
    return reading
  }

  setScenario(scenario: ScenarioId): void {
    this.scenario = scenario
  }

  setNetworkOnline(value: boolean): void {
    this.networkOnline = value
  }

  setAiEnabled(value: boolean): void {
    this.aiEnabled = value
  }

  getScenario(): ScenarioId {
    return this.scenario
  }

  getCurrentReading(): Reading {
    return this.history[this.history.length - 1]!
  }

  getHistory(range?: TimeRange): Reading[] {
    if (!range) return this.history
    return this.history.slice(-RANGE_POINTS[range])
  }

  getForecast(): ForecastPoint[] {
    return generateForecast(this.history, this.scenario)
  }

  getSourceInference(): SourceInference {
    return classifySource(this.getCurrentReading())
  }

  getAdvisories(): AdvisoryContent[] {
    const inference = this.getSourceInference()
    return buildAdvisories(this.scenario, inference.source.id, this.getCurrentReading())
  }

  getMapNodeReadings(): MapNodeReading[] {
    const current = this.getCurrentReading()
    return MAP_NODES.map((node) => {
      const pm25 = Math.round(Math.min(280, current.pm25 * node.intensity))
      return {
        id: node.id,
        name: node.name,
        x: node.x,
        y: node.y,
        zone: node.zone,
        pm25,
        band: bandForPm(pm25, METRIC_THRESHOLDS.pm25),
      }
    })
  }

  getDemoState(): DemoState {
    return {
      scenario: this.scenario,
      networkOnline: this.networkOnline,
      aiEnabled: this.aiEnabled,
      dataSource: this.dataSource,
      totalReadingsLogged: this.totalReadingsLogged,
      lastUpdateTs: this.lastUpdateTs,
    }
  }
}

export const stateStore = new AirSightStateStore()
