import { Wind, Gauge, Cloud, Sparkles, Thermometer, Droplets } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { MetricCard } from '@/components/ui/MetricCard'
import { AirQualityGauge } from '@/components/ui/AirQualityGauge'
import { LiveChart } from '@/components/ui/LiveChart'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SimulatedBadge } from '@/components/ui/SimulatedBadge'
import { useAirSight } from '@/hooks/useAirSightState'
import { bandForIndex, bandForPm, compositeIndex, dominantPollutant, METRIC_THRESHOLDS } from '@/utils/aqi'
import { timeAgo } from '@/utils/format'

export function LiveDashboard() {
  const { current, networkOnline, aiEnabled, lastUpdateTs } = useAirSight()
  const index = compositeIndex(current)
  const band = bandForIndex(index)

  return (
    <section id="live-air" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="Live Air Intelligence" title="What's happening right now?" className="mb-0" />
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-data text-[var(--color-text-secondary)]">
              <span>EDGE NODE: <span className="text-[var(--color-text-primary)]">CAMPUS-01</span></span>
              <StatusBadge tone={networkOnline ? 'emerald' : 'amber'} pulse={networkOnline}>
                {networkOnline ? 'Online' : 'Offline'}
              </StatusBadge>
              <span>LAST UPDATE: {timeAgo(lastUpdateTs)}</span>
              <span>INFERENCE: {aiEnabled ? 'LOCAL' : 'PAUSED'}</span>
            </div>
            <SimulatedBadge />
          </div>
        </div>

        <div className="mt-14 grid xl:grid-cols-[1fr_320px] gap-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
            <MetricCard
              icon={Wind}
              label="PM2.5"
              value={current.pm25.toFixed(0)}
              unit="µg/m³"
              band={bandForPm(current.pm25, METRIC_THRESHOLDS.pm25)}
            />
            <MetricCard
              icon={Gauge}
              label="PM10"
              value={current.pm10.toFixed(0)}
              unit="µg/m³"
              band={bandForPm(current.pm10, METRIC_THRESHOLDS.pm10)}
              delay={0.05}
            />
            <MetricCard
              icon={Cloud}
              label="CO₂"
              value={current.co2.toFixed(0)}
              unit="ppm"
              band={bandForPm(current.co2, METRIC_THRESHOLDS.co2)}
              delay={0.1}
            />
            <MetricCard
              icon={Sparkles}
              label="VOC"
              value={current.voc.toFixed(0)}
              unit="idx"
              band={bandForPm(current.voc, METRIC_THRESHOLDS.voc)}
              delay={0.15}
            />
            <MetricCard icon={Thermometer} label="Temperature" value={current.temp.toFixed(1)} unit="°C" delay={0.2} />
            <MetricCard icon={Droplets} label="Humidity" value={current.humidity.toFixed(0)} unit="%" delay={0.25} />
          </div>

          <GlassCard className="p-6 flex items-center justify-center">
            <AirQualityGauge index={index} band={band} dominant={dominantPollutant(current)} />
          </GlassCard>
        </div>

        <GlassCard className="mt-8 p-6 sm:p-8">
          <LiveChart />
        </GlassCard>
      </div>
    </section>
  )
}
