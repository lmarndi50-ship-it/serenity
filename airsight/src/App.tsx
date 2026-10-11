import { AirSightProvider } from '@/hooks/useAirSightState'
import { BackgroundAtmosphere } from '@/components/layout/BackgroundAtmosphere'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { DemoController } from '@/components/layout/DemoController'
import { Hero } from '@/sections/Hero'
import { Problem } from '@/sections/Problem'
import { EdgeAIArchitecture } from '@/sections/EdgeAIArchitecture'
import { LiveDashboard } from '@/sections/LiveDashboard'
import { SourceDetection } from '@/sections/SourceDetection'
import { Forecast } from '@/sections/Forecast'
import { Advisory } from '@/sections/Advisory'
import { PollutionMapSection } from '@/sections/PollutionMapSection'
import { Hardware } from '@/sections/Hardware'
import { About } from '@/sections/About'

function App() {
  return (
    <AirSightProvider>
      <BackgroundAtmosphere />
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <EdgeAIArchitecture />
        <LiveDashboard />
        <SourceDetection />
        <Forecast />
        <Advisory />
        <PollutionMapSection />
        <Hardware />
        <About />
      </main>
      <Footer />
      <DemoController />
    </AirSightProvider>
  )
}

export default App
