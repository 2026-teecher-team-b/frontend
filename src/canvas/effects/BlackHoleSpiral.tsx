/**
 * BlackHoleSpiral.tsx — 블랙홀 강착원반 파티클 이펙트
 * healthScore < 10 인 별 주위에 회전하는 파티클 링 표시.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { visible: boolean }

const PARTICLE_COUNT = 60

export default function BlackHoleSpiral({ visible }: Props) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const phases    = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      phases[i] = (i / PARTICLE_COUNT) * Math.PI * 2
      const r = 1.8 + Math.random() * 1.4
      positions[i * 3]     = r * Math.cos(phases[i])
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4
      positions[i * 3 + 2] = r * Math.sin(phases[i])
    }
    return { positions, phases }
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [positions])

  const mat = useMemo(() => new THREE.PointsMaterial({
    color:       0xff4400,
    size:        0.18,
    transparent: true,
    opacity:     0.75,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  useFrame(({ clock }) => {
    if (!pointsRef.current || !visible) return
    const t   = clock.elapsedTime
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = phases[i] + t * (1.8 + (i % 5) * 0.15)
      const r     = 1.8 + Math.sin(t * 0.9 + phases[i]) * 0.5
      pos.setXYZ(i, r * Math.cos(angle), Math.sin(t + phases[i]) * 0.2, r * Math.sin(angle))
    }
    pos.needsUpdate = true
  })

  if (!visible) return null

  return <points ref={pointsRef} geometry={geo} material={mat} />
}
