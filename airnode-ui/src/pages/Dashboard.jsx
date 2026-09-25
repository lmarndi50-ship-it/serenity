import ActionCards from '../components/ActionCards'
import AqiHero from '../components/AqiHero'
import ForecastChart from '../components/ForecastChart'
import PollutantGrid from '../components/PollutantGrid'
import SourceCard from '../components/SourceCard'

export default function Dashboard({ latest, history }) {
  return (
    <>
      <ActionCards advice={latest.advice} />
      <div className="two-col">
        <AqiHero aqi={latest.aqi} />
        <SourceCard source={latest.source} />
      </div>
      <ForecastChart history={history} forecast={latest.forecast} />
      <PollutantGrid readings={latest.readings} history={history} />
      <p className="muted small privacy">
        Raw audio, images and location never leave this device. All analysis runs on the node.
      </p>
    </>
  )
}
