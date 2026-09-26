import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'

const EMERALD = '#39FF9A'
const CYAN = '#38D9FF'

interface SensorPodProps {
  position: [number, number, number]
  color: string
  scale?: number
}

function SensorPod({ position, color, scale = 1 }: SensorPodProps) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.09, 0.09, 0.22, 12]} />
        <meshStandardMaterial color="#123028" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ConnectorLine({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to])
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])
  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }))} />
  )
}

const SENSOR_LAYOUT: Array<{ pos: [number, number, number]; color: string }> = [
  { pos: [1.15, 0.15, 0.6], color: EMERALD },
  { pos: [-1.15, 0.15, 0.6], color: CYAN },
  { pos: [1.15, 0.15, -0.6], color: CYAN },
  { pos: [-1.15, 0.15, -0.6], color: EMERALD },
]

export function EdgeNode({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const { pointer } = useThree()

  const autoRotation = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    if (!reducedMotion) {
      autoRotation.current += delta * 0.18
    }
    const parallaxX = reducedMotion ? 0 : pointer.y * 0.15
    const parallaxY = reducedMotion ? 0 : pointer.x * 0.3
    group.current.rotation.x += (parallaxX - group.current.rotation.x) * 0.05
    group.current.rotation.y += (autoRotation.current + parallaxY - group.current.rotation.y) * 0.05
    if (!reducedMotion) {
      if (ring1.current) ring1.current.rotation.z += delta * 0.12
      if (ring2.current) ring2.current.rotation.z -= delta * 0.09
    }
  })

  return (
    <group ref={group}>
      <Float speed={reducedMotion ? 0 : 1.4} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.6}>
        {/* main board */}
        <RoundedBox args={[2.1, 0.16, 1.4]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#0d211c" metalness={0.55} roughness={0.3} />
        </RoundedBox>

        {/* circuit trace glow lines */}
        <mesh position={[0, 0.09, 0]}>
          <planeGeometry args={[1.9, 1.2]} />
          <meshBasicMaterial color={EMERALD} transparent opacity={0.06} />
        </mesh>

        {/* processor block */}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.55, 0.12, 0.55]} />
          <meshStandardMaterial color="#173a30" emissive={EMERALD} emissiveIntensity={0.35} metalness={0.6} roughness={0.25} />
        </mesh>

        {/* small display */}
        <mesh position={[0, 0.14, 0.85]}>
          <boxGeometry args={[0.5, 0.02, 0.28]} />
          <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.1} toneMapped={false} />
        </mesh>

        {/* antenna */}
        <mesh position={[0.95, 0.4, -0.55]}>
          <cylinderGeometry args={[0.015, 0.015, 0.55, 8]} />
          <meshStandardMaterial color="#7f9990" />
        </mesh>
        <mesh position={[0.95, 0.7, -0.55]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={EMERALD} emissive={EMERALD} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>

        {SENSOR_LAYOUT.map((s, i) => (
          <SensorPod key={i} position={s.pos} color={s.color} />
        ))}
        {SENSOR_LAYOUT.map((s, i) => (
          <ConnectorLine key={`c${i}`} from={[0, 0.08, 0]} to={s.pos} color={s.color} />
        ))}
      </Float>

      {/* atmospheric rings */}
      <mesh ref={ring1} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.9, 0.004, 8, 96]} />
        <meshBasicMaterial color={EMERALD} transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 2.1, 0.3, 0]}>
        <torusGeometry args={[2.35, 0.003, 8, 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.25} />
      </mesh>

      <Sparkles
        count={reducedMotion ? 0 : 70}
        scale={[4.5, 3, 4.5]}
        size={2}
        speed={reducedMotion ? 0 : 0.25}
        opacity={0.5}
        color={EMERALD}
      />
    </group>
  )
}
