/**
 * InstancedStarField.tsx — 모든 별을 단일 InstancedMesh로 렌더링
 *
 * [색상 적용 원리 — THREE.js 셰이더 컴파일 이슈]
 * InstancedMesh는 instanceColor가 null이면 USE_INSTANCING_COLOR 없이 셰이더를 컴파일.
 * 이후 setColorAt을 아무리 불러도 색상이 적용되지 않음.
 * 해결:
 *   1. useLayoutEffect([]) — 마운트 직후 instanceColor 초기화 + material.needsUpdate = true
 *   2. useFrame 초반 몇 프레임 — material.needsUpdate = true 재강제 (타이밍 보장)
 *   3. 매 프레임 instanceColor.needsUpdate = true 로 GPU 버퍼 동기화
 *
 * [별 크기]
 * STAR_SCALE = 5.0 배율 적용 — MeshBasicMaterial은 emissive 글로우가 없으므로
 * 크게 키워야 카메라(distance ~280) 에서 선명하게 보임.
 */

import { useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Shape, ExtrudeGeometry } from 'three'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { physicsStore } from '@/store/physicsStore'
import {
  scoreToRadius,
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

/** InstancedMesh 최대 슬롯 수 — args에 고정해야 R3F가 재생성하지 않음 */
const MAX_INSTANCES = 2000

/**
 * 별 크기 배율.
 * 카메라(~317 units)에서 은하 전체가 보이는 시야 기준.
 * 너무 크면 별들이 겹쳐 은하 구조가 안 보이므로 2.5로 축소.
 */
const STAR_SCALE = 2.5

// ── 재사용 Three.js 객체 (GC 방지) ─────────────────────────────────
const _mat   = new THREE.Matrix4()
const _pos   = new THREE.Vector3()
const _quat  = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _euler = new THREE.Euler()
const _color = new THREE.Color()
const _white = new THREE.Color('#ffffff')

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

  // 셰이더 재컴파일용 카운터 — count > 0 이후 처음 몇 프레임 동안 material.needsUpdate 강제
  const shaderBootFrames = useRef(0)

  // count 변경 시 버퍼 재할당
  useLayoutEffect(() => {
    rotY.current     = new Float32Array(count)
    rotZ.current     = new Float32Array(count)
    rotX.current     = new Float32Array(count)
    fadeAge.current  = new Float32Array(count)
    curScale.current = new Float32Array(count)
    // count가 생기면 셰이더 재컴파일 카운터 리셋
    shaderBootFrames.current = 0

    // count가 0→N으로 바뀔 때 instanceColor 버퍼 재초기화
    // (마운트 시점에 count=0이면 useLayoutEffect([])가 효과 없으므로 여기서 보정)
    const mesh = meshRef.current
    if (mesh && count > 0) {
      mesh.setColorAt(0, _white)
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      if (mat) (mat as THREE.Material).needsUpdate = true
    }
  }, [count])

  // ── 셰이더 USE_INSTANCING_COLOR 초기화 ──────────────────────────
  // 마운트 직후(첫 rAF 이전)에 instanceColor를 non-null로 만들고
  // material.needsUpdate = true 로 셰이더 재컴파일을 예약.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    // instanceColor 버퍼 생성 (setColorAt 호출 시 자동 생성)
    mesh.setColorAt(0, _white)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // 셰이더 재컴파일 예약 — USE_INSTANCING_COLOR 포함 버전으로
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (mat) (mat as THREE.Material).needsUpdate = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── physicsStore 등록 ────────────────────────────────────────────
  useEffect(() => {
    repositories.forEach((repo) => {
      const score = scores[repo.id]
      const activityScore = score?.activityScore ?? 50
      physicsStore.register(repo.id, [0, 0, 0], repo.language, activityScore)
    })
    const repoIds = new Set(repositories.map((r) => r.id))
    physicsStore.entries.forEach((_, id) => {
      if (!repoIds.has(id)) physicsStore.unregister(id)
    })
  }, [repositories, scores])

  // ── 매 프레임 업데이트 ──────────────────────────────────────────
  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || count === 0) return

    const dt = Math.min(delta, 0.05)

    // count가 처음 생긴 직후 몇 프레임: material.needsUpdate = true 강제
    // (셰이더 재컴파일 타이밍 보장 — 환경에 따라 useLayoutEffect만으론 부족할 수 있음)
    if (shaderBootFrames.current < 8) {
      shaderBootFrames.current++
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      if (mat) (mat as THREE.Material).needsUpdate = true
    }

    for (let i = 0; i < count; i++) {
      const repoId = instanceToRepoId[i]
      const entry  = physicsStore.entries.get(repoId)

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
      const isHidden    = langFilter.length > 0 && !langFilter.includes(repo.language ?? '')

      // ── 페이드인 ─────────────────────────────────────────────
      fadeAge.current[i] = Math.min(fadeAge.current[i] + dt * 2.8, 1.0)
      const fadeT = fadeAge.current[i]

      // ── 스케일 Lerp (STAR_SCALE 배율 적용) ───────────────────
      const targetScale = isHidden ? 0 : scoreToRadius(sizeScore, actScore) * STAR_SCALE
      const hoverMult   = isHovered ? 1.35 : 1.0
      const prevScale   = curScale.current[i] || 0
      curScale.current[i] = prevScale + (targetScale - prevScale) * (3.5 * dt)
      const finalScale = Math.max(0, curScale.current[i] * hoverMult * fadeT)

      // ── 자전 ─────────────────────────────────────────────────
      const speedMult = isBlackHole ? 4.5 : 1.0
      rotY.current[i] += dt * rotSpeeds[i] * speedMult * 0.04
      rotZ.current[i] += dt * rotSpeeds[i] * speedMult * 0.02
      if (isBlackHole) rotX.current[i] += dt * 0.15

      _euler.set(rotX.current[i], rotY.current[i], rotZ.current[i])
      _quat.setFromEuler(_euler)
      _pos.copy(entry.position)
      _scale.setScalar(finalScale)
      _mat.compose(_pos, _quat, _scale)
      mesh.setMatrixAt(i, _mat)

      // ── 색상: 매 프레임 언어별 원색으로 설정 ─────────────────
      if (isBlackHole) {
        _color.set('#050508')
      } else {
        _color.set(getLanguageColor(repo.language))
        if (isHovered) _color.lerp(_white, 0.30)
      }
      mesh.setColorAt(i, _color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  // ── 이벤트 핸들러 ────────────────────────────────────────────────
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const idx = e.instanceId
    if (idx === undefined || idx < 0) return
    const repoId = instanceToRepoId[idx]
    if (repoId !== undefined) {
      selectRepo(repoId)
    }
  }

  // ── 블랙홀 레포 목록 ─────────────────────────────────────────────
  const blackHoleRepos = useMemo(
    () => repositories.filter((r) => (scores[r.id]?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD),
    [repositories, scores],
  )

  if (count === 0) return null

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[SHARED_GEO, undefined, MAX_INSTANCES]}
        count={count}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        frustumCulled={false}
      >
        {/*
          vertexColors 제거 — ExtrudeGeometry에 color 속성이 없어서
          vertexColors=true 시 vColor=(0,0,0) → instanceColor 곱해도 검은색.
          vertexColors 없으면 base = material.color(흰색) × instanceColor = 언어 색상 ✓
        */}
        <meshBasicMaterial color="white" />
      </instancedMesh>

      {blackHoleRepos.map((repo) => (
        <BlackHoleWrapper key={repo.id} repoId={repo.id} />
      ))}
    </>
  )
}
