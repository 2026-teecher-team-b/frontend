/**
 * Star.tsx — 저장소 하나를 3D 별로 표현
 *
 * [물리 연동]
 *  - mount 시 physicsStore.register() → physicsStore.setMesh()
 *  - usePhysics(Scene 내)가 매 프레임 mesh.position을 직접 갱신
 *  - React 리렌더 없이 위치 변경 → 최적 성능
 *
 * [점수 → 시각 바인딩]
 *  - Zustand scores[repoId] 구독 (해당 별만 리렌더)
 *  - useFrame 내 Lerp로 크기·밝기 부드럽게 전환
 *
 * [페이드인]
 *  - 최초 마운트 시 scale 0 → 목표값으로 1.5초에 걸쳐 페이드인
 *
 * [블랙홀]
 *  - healthScore < 10 → 검정 + 빠른 자전 + scale 살짝 수축
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import type { StarProps } from '@/types/canvas'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
//import { physicsStore } from '@/store/physicsStore'
import { scoreToRadius, scoreToEmissiveIntensity } from '@/utils/physics'

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

// ─────────────────────────────────────────────────────────────────
export default function Star({ repoId, name, position, language, onClick }: StarProps) {
  const meshRef = useRef<Mesh>(null)
  const matRef  = useRef<MeshStandardMaterial>(null)

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
  const curRadius   = useRef(0)       // 0에서 시작 → 페이드인
  const curEmissive = useRef(0)
  const fadeAge     = useRef(0)       // 마운트 후 경과 시간 (초)
  const hoveredRef  = useRef(false)

  {/*
  // ── physicsStore 등록 ─────────────────────────────────────────────
  useEffect(() => {
    physicsStore.register(repoId, position, language)
    return () => physicsStore.unregister(repoId)
  }, [repoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // mesh ref가 준비된 후 physicsStore에 연결
  useEffect(() => {
    if (meshRef.current) physicsStore.setMesh(repoId, meshRef.current)
  }, [repoId])
    */}

  // ── 매 프레임: Lerp 갱신 (크기·밝기·페이드인) ──────────────────
  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return

    // 페이드인: 마운트 후 1.5초에 걸쳐 0 → 1
    const prevAge = fadeAge.current
    fadeAge.current = Math.min(fadeAge.current + delta, 1.5)
    const fadeT = fadeAge.current / 1.5          // 0 → 1
    const justAppeared = prevAge < 1.5            // 아직 페이드인 중

    // Lerp 속도: 점수가 크게 변할수록 빠르게 반응
    const speed = 3.5 * delta

    curRadius.current   += (targetRadius   - curRadius.current)   * speed
    curEmissive.current += (targetEmissive - curEmissive.current) * speed

    // 스케일 = Lerp 반지름 × hover 배율 × 페이드인
    const hoverMult = hoveredRef.current ? 1.35 : 1.0
    const finalScale = curRadius.current * hoverMult * (justAppeared ? fadeT : 1)
    meshRef.current.scale.setScalar(Math.max(0, finalScale))

    // emissive 강도
    matRef.current.emissiveIntensity =
      curEmissive.current * (hoveredRef.current ? 2.0 : 1.0) * (justAppeared ? fadeT : 1)
    matRef.current.opacity = justAppeared ? fadeT : 1

    // 자전 (블랙홀은 빠르게)
    meshRef.current.rotation.y += delta * (isBlackHole ? 1.2 : 0.18)
    if (isBlackHole) meshRef.current.rotation.z += delta * 0.5
  })

  return (
    <mesh
      ref={meshRef}
      // position은 초기값만 — physicsStore/usePhysics가 매 프레임 덮어씀
      position={position}
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
          console.log(`[Star] ${name} | activity=${activityScore} health=${healthScore}${isBlackHole ? ' 🕳️ 블랙홀' : ''}`)
        }
      }}
    >
      {/* 반지름 1 고정, scale로 크기 제어 */}
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={isBlackHole ? '#000000' : color}
        emissiveIntensity={targetEmissive}
        roughness={isBlackHole ? 1.0 : 0.3}
        metalness={isBlackHole ? 0.0 : 0.1}
        transparent
        opacity={1}
      />
    </mesh>
  )
}
