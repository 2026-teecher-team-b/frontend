/**
 * InstancedStarField.tsx — 모든 별을 단일 InstancedMesh로 렌더링
 *
 * [왜 Instanced?]
 *  - 개별 <Star> 컴포넌트 방식: 1000개 = 1000번 draw call → GPU 병목
 *  - InstancedMesh: 수만 개도 draw call 1번으로 처리 → 60fps 유지
 *
 * [동작 방식]
 *  - repositories 배열 길이 = instance count
 *  - 매 프레임 physicsStore에서 위치 읽어 instanceMatrix 갱신
 *  - 언어 색상 + health 밝기를 instanceColor로 표현 (bakeEmissive)
 *  - hover/click: e.instanceId → repoId 매핑
 *
 * [블랙홀 처리]
 *  - healthScore < BLACKHOLE_HEALTH_THRESHOLD인 레포는 검정 + 빠른 자전
 *  - BlackHoleSpiral은 별도 컴포넌트로 해당 레포 위치에만 렌더링 (적은 수)
 *
 * [언어 필터]
 *  - 숨겨야 할 instance는 scale을 0으로 세팅 (invisible, still in buffer)
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Shape, ExtrudeGeometry } from 'three'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { physicsStore } from '@/store/physicsStore'
import {
  scoreToRadius,
  scoreToEmissiveIntensity,
  getLanguageColor,
  BLACKHOLE_HEALTH_THRESHOLD,
} from '@/utils/physics'
import BlackHoleWrapper from '@/canvas/effects/BlackHoleWrapper'

// ── 5각별 ExtrudeGeometry (앱 전체 공유) ────────────────────────────
function createStarGeometry(): ExtrudeGeometry {
  const outerR = 1.0, innerR = 0.40, pts = 5
  const step = (Math.PI * 2) / pts
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
    depth, bevelEnabled: true,
    bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 2,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

const SHARED_GEO = createStarGeometry()

// ── 재사용 Three.js 객체 (GC 방지) ─────────────────────────────────
const _mat = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _euler = new THREE.Euler()
const _color = new THREE.Color()

// ─────────────────────────────────────────────────────────────────────
export default function InstancedStarField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)
  const langFilter   = useUIStore((s) => s.langFilter)
  const { selectRepo, setHovered } = useUIStore()

  const count = repositories.length

  // ── instanceId ↔ repoId 매핑 ─────────────────────────────────────
  const instanceToRepoId = useMemo(
    () => repositories.map((r) => r.id),
    [repositories],
  )
  const repoIdToInstance = useMemo(() => {
    const m = new Map<number, number>()
    repositories.forEach((r, i) => m.set(r.id, i))
    return m
  }, [repositories])

  // ── 별마다 다른 회전 속도 (seeded) ──────────────────────────────
  const rotSpeeds = useMemo(
    () => repositories.map((r) => 0.5 + (r.id % 17) * 0.035),
    [repositories],
  )

  // ── Per-instance 상태 (Float32Array — React 상태 아님) ───────────
  const rotY     = useRef<Float32Array>(new Float32Array(0))
  const rotZ     = useRef<Float32Array>(new Float32Array(0))
  const rotX     = useRef<Float32Array>(new Float32Array(0))
  const fadeAge  = useRef<Float32Array>(new Float32Array(0))
  const curScale = useRef<Float32Array>(new Float32Array(0))
  const hoveredIdx = useRef(-1)

  // count가 바뀌면 버퍼 재할당
  useEffect(() => {
    rotY.current     = new Float32Array(count)
    rotZ.current     = new Float32Array(count)
    rotX.current     = new Float32Array(count)
    fadeAge.current  = new Float32Array(count)
    curScale.current = new Float32Array(count)
  }, [count])

  // ── physicsStore 등록 (기존 Star.tsx가 하던 역할) ───────────────
  useEffect(() => {
    repositories.forEach((repo) => {
      const score = scores[repo.id]
      const activityScore = score?.activityScore ?? 50
      // 이미 등록된 레포는 register 내부에서 skip됨
      physicsStore.register(repo.id, [0, 0, 0], repo.language, activityScore)
    })
    // 더 이상 존재하지 않는 레포 정리
    const repoIds = new Set(repositories.map((r) => r.id))
    physicsStore.entries.forEach((_, id) => {
      if (!repoIds.has(id)) physicsStore.unregister(id)
    })
  }, [repositories, scores])

  // ── 인스턴스 색상 업데이트 (scores 변경 시) ─────────────────────
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || count === 0) return

    for (let i = 0; i < count; i++) {
      const repo        = repositories[i]
      const score       = scores[repo.id]
      const healthScore = score?.healthScore ?? 50
      const isBlackHole = healthScore < BLACKHOLE_HEALTH_THRESHOLD

      if (isBlackHole) {
        _color.set('#050508')
      } else {
        const langHex = getLanguageColor(repo.language)
        _color.set(langHex)
        // health 점수에 따라 밝기 조절 (emissive 효과를 색에 베이킹)
        const brightness = 0.5 + scoreToEmissiveIntensity(healthScore) * 0.3
        _color.multiplyScalar(brightness)
      }
      mesh.setColorAt(i, _color)
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [repositories, scores, count])

  // ── 매 프레임 업데이트 ──────────────────────────────────────────
  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || count === 0) return

    const dt = Math.min(delta, 0.05)
    let colorDirty = false

    for (let i = 0; i < count; i++) {
      const repoId = instanceToRepoId[i]
      const entry  = physicsStore.entries.get(repoId)

      // physicsStore에 아직 없는 레포 → 크기 0으로 숨김
      if (!entry) {
        _scale.setScalar(0)
        _mat.compose(_pos, _quat, _scale)
        mesh.setMatrixAt(i, _mat)
        continue
      }

      const repo        = repositories[i]
      const score       = scores[repoId]
      const actScore    = score?.activityScore ?? 50
      const healthScore = score?.healthScore   ?? 50
      const sizeScore   = score?.sizeScore     ?? 30
      const isBlackHole = healthScore < BLACKHOLE_HEALTH_THRESHOLD
      const isHovered   = i === hoveredIdx.current

      // 언어 필터 숨김
      const isHidden = langFilter.length > 0 && !langFilter.includes(repo.language ?? '')

      // 페이드인
      fadeAge.current[i] = Math.min(fadeAge.current[i] + dt, 1.0)
      const fadeT = fadeAge.current[i]

      // 목표 스케일
      const targetScale = isHidden ? 0 : scoreToRadius(sizeScore, actScore)
      const hoverMult   = isHovered ? 1.35 : 1.0

      // Lerp 스케일 (부드러운 확대/축소)
      curScale.current[i] += (targetScale - curScale.current[i]) * (3.5 * dt)
      const finalScale = Math.max(0, curScale.current[i] * hoverMult * fadeT)

      // 자전
      const speedMult = isBlackHole ? 4.5 : 1.0
      rotY.current[i] += dt * rotSpeeds[i] * speedMult * 0.14
      rotZ.current[i] += dt * rotSpeeds[i] * speedMult * 0.07
      if (isBlackHole) rotX.current[i] += dt * 0.5

      _euler.set(rotX.current[i], rotY.current[i], rotZ.current[i])
      _quat.setFromEuler(_euler)
      _pos.copy(entry.position)
      _scale.setScalar(finalScale)

      _mat.compose(_pos, _quat, _scale)
      mesh.setMatrixAt(i, _mat)

      // hover 시 색상 펄스 (매 프레임 갱신은 비용이 크므로 hover 인스턴스만)
      if (isHovered && mesh.instanceColor) {
        const langHex   = getLanguageColor(repo.language)
        const healthSc  = score?.healthScore ?? 50
        _color.set(isBlackHole ? '#050508' : langHex)
        if (!isBlackHole) _color.multiplyScalar(0.5 + scoreToEmissiveIntensity(healthSc) * 0.45)
        mesh.setColorAt(i, _color)
        colorDirty = true
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (colorDirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  // ── 이벤트 핸들러 ────────────────────────────────────────────────
  const handlePointerOver = (e: THREE.Event & { instanceId?: number }) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation?.()
    const idx = e.instanceId
    if (idx === undefined || idx < 0) return
    hoveredIdx.current = idx
    const repoId = instanceToRepoId[idx]
    if (repoId !== undefined) {
      setHovered(repoId)
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    hoveredIdx.current = -1
    setHovered(null)
    document.body.style.cursor = 'grab'
  }

  const handleClick = (e: THREE.Event & { instanceId?: number }) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation?.()
    const idx = e.instanceId
    if (idx === undefined || idx < 0) return
    const repoId = instanceToRepoId[idx]
    if (repoId !== undefined) {
      selectRepo(repoId)
      if (import.meta.env.DEV) {
        const repo  = repositories[idx]
        const score = scores[repoId]
        console.log(
          `[Galaxy] ${repo?.name} | activity=${score?.activityScore} health=${score?.healthScore}` +
          ((score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD ? ' 🕳️ 블랙홀' : ''),
        )
      }
    }
  }

  // ── 블랙홀 레포 목록 (BlackHoleSpiral 전용) ─────────────────────
  const blackHoleRepos = useMemo(
    () => repositories.filter((r) => (scores[r.id]?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD),
    [repositories, scores],
  )

  if (count === 0) return null

  return (
    <>
      {/* ── 단일 InstancedMesh — 모든 별 ───────────────────────── */}
      <instancedMesh
        ref={meshRef}
        args={[SHARED_GEO, undefined, count]}
        onClick={handleClick as never}
        onPointerOver={handlePointerOver as never}
        onPointerOut={handlePointerOut}
        frustumCulled={false}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.22}
          metalness={0.42}
          transparent
          emissive="#ffffff"
          emissiveIntensity={0.08}
        />
      </instancedMesh>

      {/* ── 블랙홀 강착원반 — 해당 레포 위치에만 개별 렌더링 ─────── */}
      {blackHoleRepos.map((repo) => (
        <BlackHoleWrapper key={repo.id} repoId={repo.id} />
      ))}
    </>
  )
}
