import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Particle {
  left: number
  top: number
  size: number
  duration: number
  delay: number
  opacity: number
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
        opacity: 0.15 + Math.random() * 0.35,
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
          top: '-10%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(57,255,154,0.09), transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <div
        className={reducedMotion ? '' : 'animate-drift'}
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '55%',
          height: '55%',
          background: 'radial-gradient(circle, rgba(56,217,255,0.08), transparent 70%)',
          filter: 'blur(10px)',
          animationDelay: '-3s',
        }}
      />

      {!reducedMotion &&
        particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[var(--color-accent-cyan)]"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `drift ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-bg-primary)]" />
    </div>
  )
}
