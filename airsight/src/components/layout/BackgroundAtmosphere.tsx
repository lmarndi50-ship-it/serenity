import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Particle {
  left: number
  top: number
  size: number
  duration: number
  delay: number
  opacity: number
  color: string
}

function useParticleCount() {
  const [count, setCount] = useState(28)
  useEffect(() => {
    const update = () => setCount(window.innerWidth < 768 ? 10 : 28)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return count
}

export function BackgroundAtmosphere() {
  const reducedMotion = useReducedMotion()
  const count = useParticleCount()

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 14 + Math.random() * 18,
        delay: -Math.random() * 20,
        opacity: 0.18 + Math.random() * 0.42,
        color: Math.random() > 0.45 ? 'var(--color-accent-cyan)' : 'var(--color-accent-emerald)',
      })),
    [count],
  )

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[var(--color-bg-primary)]" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 90%)',
        }}
      />

      <div
        className={reducedMotion ? '' : 'animate-drift'}
        style={{
          position: 'absolute',
          top: '-14%',
          left: '-12%',
          width: '62%',
          height: '62%',
          background: 'radial-gradient(circle, rgba(60,255,166,0.16), transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <div
        className={reducedMotion ? '' : 'animate-drift'}
        style={{
          position: 'absolute',
          bottom: '-18%',
          right: '-12%',
          width: '58%',
          height: '58%',
          background: 'radial-gradient(circle, rgba(79,224,255,0.14), transparent 70%)',
          filter: 'blur(10px)',
          animationDelay: '-3s',
        }}
      />
      <div
        className={reducedMotion ? '' : 'animate-drift'}
        style={{
          position: 'absolute',
          top: '35%',
          left: '35%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(255,203,102,0.05), transparent 72%)',
          filter: 'blur(14px)',
          animationDelay: '-6s',
        }}
      />

      {!reducedMotion &&
        particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              background: p.color,
              boxShadow: `0 0 6px 0 ${p.color}`,
              animation: `drift ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-bg-primary)]" />
    </div>
  )
}
