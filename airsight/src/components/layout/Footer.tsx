const LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live-air', label: 'Live Air' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'map', label: 'Map' },
  { id: 'hardware', label: 'Hardware' },
]

const TECH = ['Arduino UNO Q', 'Edge AI', 'Python', 'C++', 'TensorFlow Lite / ONNX']

export function Footer() {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="relative border-t border-[var(--color-border-subtle)] mt-24">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="text-xl font-semibold text-[var(--color-text-primary)]">AIRSIGHT</div>
          <div className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data mt-1">
            Hyperlocal Air Intelligence
          </div>
          <p className="mt-6 text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
            Sense locally.
            <br />
            Understand instantly.
            <br />
            Act intelligently.
          </p>
        </div>

        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data mb-4">
            Navigate
          </div>
          <ul className="space-y-3">
            {LINKS.map((link) => (
              <li key={link.id}>
                <button
                  onClick={() => scrollTo(link.id)}
                  className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-emerald)] transition-colors"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data mb-4">
            Technology
          </div>
          <ul className="space-y-3">
            {TECH.map((tech) => (
              <li key={tech} className="text-sm text-[var(--color-text-secondary)]">
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-border-subtle)]">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] font-data">
          <span>Built for Edge AI innovation.</span>
          <span>Sensor data on this site is simulated for demonstration.</span>
        </div>
      </div>
    </footer>
  )
}
