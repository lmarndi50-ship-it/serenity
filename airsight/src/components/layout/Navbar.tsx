import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useAirSight } from '@/hooks/useAirSightState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cx } from '@/utils/format'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live-air', label: 'Live Air' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'map', label: 'Pollution Map' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'about', label: 'About' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = useActiveSection(NAV_ITEMS.map((n) => n.id))
  const { networkOnline } = useAirSight()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileOpen(false)
  }

  return (
    <header
      className={cx(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'py-3' : 'py-5',
      )}
    >
      <div
        className={cx(
          'mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between rounded-2xl transition-all duration-300',
          scrolled && 'glass-panel mx-4 sm:mx-6 px-6 py-2.5',
        )}
      >
        <button
          onClick={() => scrollTo('overview')}
          className="flex flex-col items-start leading-none group"
          aria-label="AIRSIGHT home"
        >
          <span className="text-lg font-semibold tracking-tight font-[var(--font-heading)] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-emerald)] transition-colors">
            AIRSIGHT
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-muted)] font-data">
            Hyperlocal Air Intelligence
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={cx(
                'relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200',
                active === item.id
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
              aria-current={active === item.id ? 'true' : undefined}
            >
              {active === item.id && (
                <span className="absolute inset-0 rounded-full bg-[var(--color-accent-emerald)]/[0.08] border border-[var(--color-accent-emerald)]/25" />
              )}
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center">
          <StatusBadge tone={networkOnline ? 'emerald' : 'amber'}>
            {networkOnline ? 'System Online' : 'Node Offline · AI Active'}
          </StatusBadge>
        </div>

        <button
          className="lg:hidden text-[var(--color-text-primary)] p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden mx-4 mt-2 glass-panel rounded-2xl p-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={cx(
                'text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                active === item.id
                  ? 'bg-white/[0.06] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)]',
              )}
            >
              {item.label}
            </button>
          ))}
          <div className="px-4 pt-2">
            <StatusBadge tone={networkOnline ? 'emerald' : 'amber'}>
              {networkOnline ? 'System Online' : 'Node Offline · AI Active'}
            </StatusBadge>
          </div>
        </div>
      )}
    </header>
  )
}
