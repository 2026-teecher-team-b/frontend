/**
 * Star.tsx — 저장소 하나를 3D 별(★)로 표현
 *
 * [물리 연동 — 핵심 주의사항]
 *  - <group>에 position prop을 전달하지 않는다.
 *    R3F는 리렌더 시 position prop을 group.position.set()으로 다시 적용하므로
 *    물리 계산 결과를 덮어쓰게 된다 → 별이 제자리에 고정되는 버그 발생.
 *  - 대신 useEffect에서 groupRef.current.position.copy()로 초기 위치를 딱 한 번 세팅.
 *  - 이후 매 프레임 usePhysics가 e.object.position.copy(e.position)으로 갱신한다.
 *
 * [별 모양]
 *  - 구체 → 5각별 ExtrudeGeometry로 교체
 *  - scale로 크기 제어 (점수 → 반지름 lerp)
 *  - Y + Z 다중축 자전 (별마다 다른 속도)
 *
 * [블랙홀]
 *  - healthScore < 10 → 검정 + 빠른 자전 + BlackHoleSpiral 이펙트
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { StarProps } from '@/types/canvas'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { physicsStore } from '@/store/physicsStore'
import { scoreToRadius, scoreToEmissiveIntensity } from '@/utils/physics'
import BlackHoleSpiral from '@/canvas/effects/BlackHoleSpiral'

// ── 언어 → 색상 ───────────────────────────────────────────────────
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#4f8ef7',
  JavaScript:  '#f7d44f',
  Python:      '#4da8e0',
  Go:          '#00d4c8',
  Rust:        '#f07050',
  Java:        '#e8a24a',
  'C++':       '#e05080',
  Ruby:        '#d94040',
  Swift:       '#f05c30',
  Kotlin:      '#b06cff',
  PHP:         '#9090e0',
  'C#':        '#68c060',
  Scala:       '#d04040',
  Haskell:     '#9060c8',
}
const DEFAULT_COLOR = '#aabbcc'

function getColor(language: string | null) {
  return language ? (LANGUAGE_COLORS[language] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

// ── 5각별 ExtrudeGeometry 생성 ────────────────────────────────────
function createStarGeometry(): THREE.ExtrudeGeometry {
  const outerR = 1.0
  const innerR = 0.40
  const pts   = 5
  const step  = (Math.PI * 2) / pts

  const shape = new THREE.Shape()
  for (let i = 0; i < pts; i++) {
    const oa = i * step - Math.PI / 2
    const ia = oa + step / 2
    const ox = Math.cos(oa) * outerR, oy = Math.sin(oa) * outerR
    const ix = Math.cos(ia) * innerR, iy = Math.sin(ia) * innerR
    if (i === 0) shape.moveTo(ox, oy)
    else         shape.lineTo(ox, oy)
    shape.lineTo(ix, iy)
  }
  shape.closePath()

  const depth = 0.30
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled:   true,
    bevelThickness: 0.07,
    bevelSize:      0.05,
    bevelSegments:  2,
  })
  // Z축 중앙 정렬 (기본: z=0~depth → 중심으로)
  geo.translate(0, 0, -depth / 2)
  return geo
}

// ── 앱 전체에서 공유되는 단일 별 지오메트리 ──────────────────────
const SHARED_STAR_GEO = createStarGeometry()

// ─────────────────────────────────────────────────────────────────
export default function Star({ repoId, name, position, language, onClick }: StarProps) {
  const groupRef = useRef<Group>(null)
  const meshRef  = useRef<Mesh>(null)
  const matRef   = useRef<MeshStandardMaterial>(null)

  // ── 별마다 다른 자전 속도 (repoId 기반 고정값) ──────────────────
  const rotSpeed = useMemo(() => 0.5 + (repoId % 17) * 0.035, [repoId])

  // ── Zustand 점수 구독 (이 repoId만 선택적 리렌더) ───────────────
  const score         = useGalaxyStore((s) => s.scores[repoId])
  const activityScore = score?.activityScore ?? 50
  const healthScore   = score?.healthScore   ?? 50
  const isBlackHole   = healthScore < 10

  const { selectRepo, setHovered } = useUIStore()

  // ── 파생 시각 목표값 ─────────────────────────────────────────────
  const targetRadius   = useMemo(() => scoreToRadius(activityScore),         [activityScore])
  const targetEmissive = useMemo(() => scoreToEmissiveIntensity(healthScore), [healthScore])
  const color          = useMemo(() => isBlackHole ? '#050508' : getColor(language), [isBlackHole, language])

  // ── Lerp용 현재값 ref (React 상태 아님 → 리렌더 없이 갱신) ──────
  const curRadius   = useRef(0)
  const curEmissive = useRef(0)
  const fadeAge     = useRef(0)
  const hoveredRef  = useRef(false)

  // ── physicsStore 등록 ─────────────────────────────────────────────
  useEffect(() => {
    physicsStore.register(repoId, position, language)
    return () => physicsStore.unregister(repoId)
  }, [repoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── group ref 연결 + 초기 위치 세팅 (R3F prop 대신 명시적 세팅) ──
  // position prop을 JSX에 넘기지 않는 이유:
  //   R3F는 리렌더마다 prop을 group.position.set()으로 재적용 →
  //   물리 계산 결과(매 프레임 갱신)를 덮어써서 별이 제자리에 고정되는 버그.
  useEffect(() => {
    if (!groupRef.current) return
    const entry = physicsStore.entries.get(repoId)
    if (entry) {
      // physicsStore에 저장된 초기 위치를 Three.js 오브젝트에 직접 복사
      groupRef.current.position.copy(entry.position)
    }
    // 이후 매 프레임 usePhysics가 이 오브젝트 position을 갱신함
    physicsStore.setObject(repoId, groupRef.current)
  }, [repoId])

  // ── 매 프레임: Lerp 갱신 (크기·밝기·페이드인·자전) ─────────────
  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return

    // 페이드인: 마운트 후 1.5초에 걸쳐 0 → 1
    const prevAge = fadeAge.current
    fadeAge.current = Math.min(fadeAge.current + delta, 1.5)
    const fadeT      = fadeAge.current / 1.5
    const fadingIn   = prevAge < 1.5

    // Lerp 속도
    const speed = 3.5 * delta
    curRadius.current   += (targetRadius   - curRadius.current)   * speed
    curEmissive.current += (targetEmissive - curEmissive.current) * speed

    // 스케일 = Lerp 반지름 × hover 배율 × 페이드인
    const hoverMult  = hoveredRef.current ? 1.35 : 1.0
    const finalScale = curRadius.current * hoverMult * (fadingIn ? fadeT : 1)
    meshRef.current.scale.setScalar(Math.max(0, finalScale))

    // emissive 강도
    matRef.current.emissiveIntensity =
      curEmissive.current * (hoveredRef.current ? 2.0 : 1.0) * (fadingIn ? fadeT : 1)
    matRef.current.opacity = fadingIn ? fadeT : 1

    // ── 다중축 자전 (블랙홀은 빠르게) ────────────────────────────
    const speedMult = isBlackHole ? 4.0 : 1.0
    meshRef.current.rotation.y += delta * rotSpeed * speedMult * 0.14
    meshRef.current.rotation.z += delta * rotSpeed * speedMult * 0.07
    if (isBlackHole) {
      meshRef.current.rotation.x += delta * 0.4
    }
  })

  return (
    // position prop 없음 — useEffect에서 명시적으로 세팅
    <group ref={groupRef}>
      {/* ── 5각별 메시 ───────────────────────────────────────────── */}
      <mesh
        ref={meshRef}
        geometry={SHARED_STAR_GEO}
        onPointerOver={(e) => {
          e.stopPropagation()
          hoveredRef.current = true
          setHovered(repoId)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hoveredRef.current = false
          setHovered(null)
          document.body.style.cursor = 'grab'
        }}
        onClick={(e) => {
          e.stopPropagation()
          selectRepo(repoId)
          onClick?.(repoId)
          if (import.meta.env.DEV) {
            console.log(
              `[Star] ${name} | activity=${activityScore} health=${healthScore}` +
              (isBlackHole ? ' 🕳️ 블랙홀' : ''),
            )
          }
        }}
      >
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={isBlackHole ? '#000000' : color}
          emissiveIntensity={targetEmissive}
          roughness={isBlackHole ? 1.0 : 0.25}
          metalness={isBlackHole ? 0.0  : 0.35}
          transparent
          opacity={1}
        />
      </mesh>

      {/* ── 블랙홀 강착원반 이펙트 ──────────────────────────────────── */}
      <BlackHoleSpiral visible={isBlackHole} />
    </group>
  )
}
