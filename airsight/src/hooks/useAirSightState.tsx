import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Reading, ScenarioId, SourceInference, ForecastPoint } from '@/types'
import { seedHistory, nextReading, generateForecast, classifySource } from '@/data/simulationEngine'

export const STEP_MS = 5 * 60 * 1000
const HISTORY_POINTS = 288 // 24h @ 5min resolution
const TICK_MS = 2000

export type TimeRange = '1H' | '6H' | '12H' | '24H'

const RANGE_POINTS: Record<TimeRange, number> = {
  '1H': 12,
  '6H': 72,
  '12H': 144,
  '24H': 288,
}

interface AirSightContextValue {
  scenario: ScenarioId
  setScenario: (s: ScenarioId) => void
  networkOnline: boolean
  setNetworkOnline: (v: boolean) => void
  aiEnabled: boolean
  setAiEnabled: (v: boolean) => void
  history: Reading[]
  current: Reading
  previous: Reading
  forecast: ForecastPoint[]
  sourceInference: SourceInference
  timeRange: TimeRange
  setTimeRange: (r: TimeRange) => void
  visibleHistory: Reading[]
  liveMode: boolean
  setLiveMode: (v: boolean) => void
  totalReadingsLogged: number
  lastUpdateTs: number
}

const AirSightContext = createContext<AirSightContextValue | null>(null)

export function AirSightProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<ScenarioId>('normal')
  const [networkOnline, setNetworkOnline] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('6H')
  const [liveMode, setLiveMode] = useState(true)
  const [lastUpdateTs, setLastUpdateTs] = useState(() => Date.now())

  const [history, setHistory] = useState<Reading[]>(() => seedHistory('normal', HISTORY_POINTS, STEP_MS))
  const [totalReadingsLogged, setTotalReadingsLogged] = useState(24381)

  const scenarioRef = useRef(scenario)
  useEffect(() => {
    scenarioRef.current = scenario
  }, [scenario])

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1]
        const nextTs = last.timestamp + STEP_MS
        const reading = nextReading(last, scenarioRef.current, nextTs)
        return [...prev.slice(1), reading]
      })
      setLastUpdateTs(Date.now())
      setTotalReadingsLogged((n) => n + 1)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const current = history[history.length - 1]
  const previous = history[Math.max(0, history.length - 6)]

  const forecast = useMemo(() => generateForecast(history, scenario), [history, scenario])
  const sourceInference = useMemo(() => classifySource(current), [current])

  const visibleHistory = useMemo(() => {
    const count = RANGE_POINTS[timeRange]
    return history.slice(-count)
  }, [history, timeRange])

  const setScenarioAndReset = useCallback((s: ScenarioId) => {
    setScenario(s)
  }, [])

  const value: AirSightContextValue = {
    scenario,
    setScenario: setScenarioAndReset,
    networkOnline,
    setNetworkOnline,
    aiEnabled,
    setAiEnabled,
    history,
    current,
    previous,
    forecast,
    sourceInference,
    timeRange,
    setTimeRange,
    visibleHistory,
    liveMode,
    setLiveMode,
    totalReadingsLogged,
    lastUpdateTs,
  }

  return <AirSightContext.Provider value={value}>{children}</AirSightContext.Provider>
}

export function useAirSight(): AirSightContextValue {
  const ctx = useContext(AirSightContext)
  if (!ctx) throw new Error('useAirSight must be used within AirSightProvider')
  return ctx
}
