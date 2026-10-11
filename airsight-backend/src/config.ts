import 'dotenv/config'

function int(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const config = {
  port: int(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  ingestApiKey: process.env.INGEST_API_KEY ?? '',
  hardwareStaleMs: int(process.env.HARDWARE_STALE_MS, 30_000),
  /** simulated minutes advanced per tick */
  stepMs: 5 * 60 * 1000,
  /** real-world ms between ticks */
  tickMs: 2000,
  historyPoints: 288, // 24h @ 5min resolution
}
