import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EdgeNode } from './EdgeNode'
import { useReducedMotion } from '@/hooks/useReducedMotion'

function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-40 w-40 rounded-full bg-[var(--color-accent-emerald)]/10 blur-2xl animate-pulse" />
    </div>
  )
}

export function EdgeNodeScene({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion()

  return (
    <div className={className}>
      <Suspense fallback={<SceneFallback />}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 1.1, 5.2], fov: 40 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          frameloop={reducedMotion ? 'demand' : 'always'}
        >
          <color attach="background" args={['#06100f']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 4, 2]} intensity={1.1} color="#eafff2" />
          <pointLight position={[-3, -1, -2]} intensity={8} color="#38D9FF" distance={8} />
          <pointLight position={[2, 2, 2]} intensity={6} color="#39FF9A" distance={8} />
          <EdgeNode reducedMotion={reducedMotion} />
        </Canvas>
      </Suspense>
    </div>
  )
}
