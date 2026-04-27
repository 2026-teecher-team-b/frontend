/**
 * BlackHoleSpiral.tsx — 블랙홀 강착원반(Accretion Disk) 이펙트
 *
 * healthScore < 10인 별 주변에 나타나는 소용돌이 파티클 링.
 * 7~8주차 '블랙홀 판정 데이터 수신 시 3D 스파이럴 애니메이션' 구현.
 *
 * 구성:
 *  1. 내부 링 (빠른 회전, 밝은 주황): 강착 물질
 *  2. 외부 링 (느린 회전, 붉은 잔상): 광자구
 *  3. 중심 이벤트 호라이즌 glow (검정 구체, BackSide 발광)
 *
 * Star.tsx의 <group> 자식으로 위치 [0,0,0]에 배치 → 별 위치 자동 추종
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── 파티클 생성 헬퍼 ─────────────────────────────────────────────────
function buildDiskGeometry(
  count: number,
  innerR: number,
  outerR: number,
  thickness: number,
  colorFn: (t: number) => [number, number, number],
): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3)
  const colors    = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const t      = i / count
    // 나선형: 각도 + 반지름이 함께 변화
    const angle  = t * Math.PI * 6 + Math.random() * 0.4
    const radius = innerR + (outerR - innerR) * Math.pow(Math.random(), 0.6)
    const height = (Math.random() - 0.5) * thickness

    positions[i * 3]     = Math.cos(angle) * radius
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(angle) * radius

    const [r, g, b] = colorFn(t)
    colors[i * 3]     = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  return { positions, colors }
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
interface BlackHoleSpiralProps {
  visible: boolean
}

export default function BlackHoleSpiral({ visible }: BlackHoleSpiralProps) {
  const innerRef = useRef<THREE.Points>(null)
  const outerRef = useRef<THREE.Points>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0)  // 페이드인 추적

  // ── 파티클 데이터 (memo → 마운트 시 한 번만 생성) ──────────────────
  const inner = useMemo(() =>
    buildDiskGeometry(120, 1.2, 2.4, 0.15,
      (t) => [1.0, 0.35 - t * 0.25, 0.0]),  // 흰→주황→적
  [])

  const outer = useMemo(() =>
    buildDiskGeometry(80, 2.4, 4.5, 0.3,
      (t) => [0.7 - t * 0.4, 0.05, 0.1]),   // 적→암적색
  [])

  // ── visibility 변경 시 opacity 초기화 ─────────────────────────────
  useEffect(() => {
    if (!visible) opacityRef.current = 0
  }, [visible])

  // ── 매 프레임 회전 + 페이드인 ────────────────────────────────────────
  useFrame((state, delta) => {
    if (!visible) return

    // 페이드인 (0 → 1, 0.8초)
    opacityRef.current = Math.min(opacityRef.current + delta * 1.25, 1)
    const opacity = opacityRef.current

    const t = state.clock.elapsedTime

    // 내부 링: 빠른 역방향 회전
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 1.4
      innerRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
      (innerRef.current.material as THREE.PointsMaterial).opacity = opacity * 0.9
    }

    // 외부 링: 느린 순방향 회전
    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.6
      outerRef.current.rotation.z = Math.cos(t * 0.3) * 0.1;
      (outerRef.current.material as THREE.PointsMaterial).opacity = opacity * 0.5
    }

    // 이벤트 호라이즌 glow 맥동
    if (glowRef.current) {
      const pulse = 0.95 + Math.sin(t * 3.2) * 0.05
      glowRef.current.scale.setScalar(pulse)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.25
    }
  })

  if (!visible) return null

  return (
    <group>
      {/* 이벤트 호라이즌 glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.15, 16, 16]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 내부 강착 디스크 */}
      <points ref={innerRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={120}
            array={inner.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={120}
            array={inner.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 외부 광자구 잔상 */}
      <points ref={outerRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={80}
            array={outer.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={80}
            array={outer.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          vertexColors
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
