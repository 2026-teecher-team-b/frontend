/**
 * Star.tsx — 저장소 하나를 3D 별(★)로 표현  v3
 *
 * [물리 연동]
 *  - <group>에 position prop 없음 — usePhysics가 매 프레임 직접 적용.
 *  - mount 시 physicsStore.register(repoId, pos, lang, activityScore)
 *
 * [별 모양]
 *  - 5각별 ExtrudeGeometry (공유 지오메트리)
 *  - 점수 → 반지름 lerp, hover 시 1.35배 확대
 *
 * [반짝임 (Twinkling)]
 *  - sin 기반 주기적 emissive 변화
 *  - 활성도 높을수록 밝고 빠르게 반짝임
 *  - 활성도 낮을수록 어둡고 느린 맥동
 *
 * [블랙홀]
 *  - healthScore < 10 → 검정 + 빠른 자전 + BlackHoleSpiral
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Shape, ExtrudeGeometry, Group } from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import type { StarProps } from '@/types/canvas'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { physicsStore } from '@/store/physicsStore'
import { scoreToRadius, scoreToEmissiveIntensity, getLanguageColor } from '@/utils/physics'
import BlackHoleSpiral from '@/canvas/effects/BlackHoleSpiral'

// ── 5각별 ExtrudeGeometry 생성 ────────────────────────────────────
function createStarGeometry(): ExtrudeGeometry {
  const outerR = 1.0
  const innerR = 0.40
  const pts    = 5
  const step   = (Math.PI * 2) / pts

  const shape = new Shape()
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
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled:   true,
    bevelThickness: 0.07,
    bevelSize:      0.05,
    bevelSegments:  2,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

// 앱 전체에서 공유되는 단일 별 지오메트리 (메모리 절약)
const SHARED_STAR_GEO = createStarGeometry()

// ─────────────────────────────────────────────────────────────────
export default function Star({ repoId, name, position, language, onClick }: StarProps) {
  const groupRef = useRef<Group | null>(null)
  const meshRef  = useRef<Mesh>(null)
  const matRef   = useRef<MeshStandardMaterial>(null)

  // ── 별마다 다른 자전 속도 ───────────────────────────────────────
  const rotSpeed = useMemo(() => 0.5 + (repoId % 17) * 0.035, [repoId])

  // ── Zustand 점수 구독 ─────────────────────────────────────────────
  const score         = useGalaxyStore((s) => s.scores[repoId])
  const activityScore = score?.activityScore ?? 50
  const healthScore   = score?.healthScore   ?? 50
  const sizeScore     = score?.sizeScore     ?? 30   // 기본 30 → 중간 크기
  // 블랙홀 기준: healthScore < 2 (시간당 0.1건 미만 = 사실상 완전 방치)
  // calcHealthScore 공식: hourlyAvg * 20 → 0.1/hr = 2점
  // 메트릭 없는 레포는 healthScore=50 기본값이므로 블랙홀 미해당
  const isBlackHole   = healthScore < 2

  // ── 언어 필터: 활성 필터가 있고 내 언어가 포함 안 되면 숨김 ────────
  const langFilter = useUIStore((s) => s.langFilter)
  const isHidden   = langFilter.length > 0 && !langFilter.includes(language ?? '')

  const { selectRepo, setHovered } = useUIStore()

  // ── 파생 시각 목표값 ─────────────────────────────────────────────
  // 별 크기 = sizeScore(기본) × activityScore(활동 배율)
  const targetRadius   = useMemo(() => scoreToRadius(sizeScore, activityScore), [sizeScore, activityScore])
  const targetEmissive = useMemo(() => scoreToEmissiveIntensity(healthScore), [healthScore])
  const color          = useMemo(
    () => isBlackHole ? '#050508' : getLanguageColor(language),
    [isBlackHole, language],
  )

  // ── Lerp용 현재값 ref (React 상태 아님 → 리렌더 없이 갱신) ──────
  const curRadius   = useRef(0)       // 0에서 시작 → 페이드인
  const curEmissive = useRef(0)
  const fadeAge     = useRef(0)       // 마운트 후 경과 시간 (초)
  const hoveredRef  = useRef(false)

  // ── physicsStore 등록 ─────────────────────────────────────────────
  useEffect(() => {
    physicsStore.register(repoId, position, language, activityScore)
    return () => physicsStore.unregister(repoId)
  }, [repoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── group ref 연결 + 초기 위치 세팅 ──────────────────────────────
  useEffect(() => {
    if (!groupRef.current) return
    const entry = physicsStore.entries.get(repoId)
    if (entry) {
      groupRef.current.position.copy(entry.position)
    }
    physicsStore.setObject(repoId, groupRef.current)
  }, [repoId])

  // ── 매 프레임: Lerp 갱신 (크기·밝기·페이드인·자전) ──────────────
  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current || !groupRef.current) return

    // 언어 필터 숨김 → 그룹 자체를 invisible (렌더링 스킵)
    groupRef.current.visible = !isHidden

    if (isHidden) return

    // 페이드인: 마운트 후 1.0초에 걸쳐 0 → 1
    fadeAge.current = Math.min(fadeAge.current + delta, 1.0)
    const fadeT = fadeAge.current / 1.0

    // Lerp 속도: 점수가 크게 변할수록 빠르게 반응
    const speed = 3.5 * delta

    curRadius.current   += (targetRadius   - curRadius.current)   * speed
    curEmissive.current += (targetEmissive - curEmissive.current) * speed

    // 스케일 = Lerp 반지름 × hover 배율 × 페이드인
    const hoverMult  = hoveredRef.current ? 1.35 : 1.0
    const finalScale = curRadius.current * hoverMult * fadeT
    meshRef.current.scale.setScalar(Math.max(0, finalScale))

    // emissive = 활성도 기반 밝기 (반짝임 없음 — 안정적인 밝기)
    // 활성도 높을수록 밝고, 낮을수록 어두움
    matRef.current.emissiveIntensity =
      curEmissive.current * (hoveredRef.current ? 2.2 : 1.0) * fadeT
    matRef.current.opacity = fadeT

    // ── 자전 (블랙홀은 빠르게) ────────────────────────────────
    const speedMult = isBlackHole ? 4.5 : 1.0
    meshRef.current.rotation.y += delta * rotSpeed * speedMult * 0.14
    meshRef.current.rotation.z += delta * rotSpeed * speedMult * 0.07
    if (isBlackHole) meshRef.current.rotation.x += delta * 0.5
  })

  return (
    // position prop 없음 — usePhysics가 매 프레임 직접 갱신
    <group ref={groupRef}>
      {/* ── 5각별 메시 ─────────────────────────────────────────── */}
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
          roughness={isBlackHole ? 1.0 : 0.20}
          metalness={isBlackHole ? 0.0  : 0.45}
          transparent
          opacity={1}
        />
      </mesh>

      {/* ── 블랙홀 강착원반 이펙트 ─────────────────────────────── */}
      <BlackHoleSpiral visible={isBlackHole} />
    </group>
  )
}
