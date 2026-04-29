/**
 * WormholeFunnel.tsx — 깔때기(Wormhole) 시각 구조물
 *
 * 구성:
 *  1. 격자선(Grid)   : 24개 세로선 + 16개 가로 원호 → 깔때기 그물망
 *  2. 입구 빛 고리   : 상단 넓은 입구의 글로잉 토러스 (파란빛)
 *  3. 특이점(목)     : 하단 좁은 목의 검은 구 + 빨간 고리
 *  4. 은하 안개      : AdditiveBlending 원뿔형 fog 입자
 *
 * 수학:
 *  r(y) = THROAT_R + (RIM_R - THROAT_R) * ((y-THROAT_Y)/(RIM_Y-THROAT_Y))^EXPONENT
 *  → 목에서 좁고 입구로 갈수록 급격히 넓어지는 깔때기
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  RIM_Y, THROAT_Y, RIM_R, THROAT_R, funnelRadius,
} from '@/utils/physics'

// ── 격자선 생성 헬퍼 ─────────────────────────────────────────────

/** 깔때기 표면 위의 점들을 Float32Array로 반환 */
function buildFunnelPoints(
  ySteps: number,
  radialSteps: number,
): { vertLines: Float32Array; horzRings: Float32Array } {
  // 세로선 (radialSteps 개): 위아래 연결
  const vertCount = radialSteps * (ySteps - 1) * 2 // 각 선마다 LineSegment 쌍
  const vertLines = new Float32Array(vertCount * 3)

  let vi = 0
  for (let r = 0; r < radialSteps; r++) {
    const theta = (r / radialSteps) * Math.PI * 2
    for (let ys = 0; ys < ySteps - 1; ys++) {
      const y0 = THROAT_Y + ((RIM_Y - THROAT_Y) * ys)       / (ySteps - 1)
      const y1 = THROAT_Y + ((RIM_Y - THROAT_Y) * (ys + 1)) / (ySteps - 1)
      const r0 = funnelRadius(y0)
      const r1 = funnelRadius(y1)

      vertLines[vi++] = r0 * Math.cos(theta)
      vertLines[vi++] = y0
      vertLines[vi++] = r0 * Math.sin(theta)

      vertLines[vi++] = r1 * Math.cos(theta)
      vertLines[vi++] = y1
      vertLines[vi++] = r1 * Math.sin(theta)
    }
  }

  // 가로 고리 (ySteps 개): 각 높이에서 원
  const ringSegments = 64
  const horzCount = ySteps * ringSegments * 2
  const horzRings = new Float32Array(horzCount * 3)

  let hi = 0
  for (let ys = 0; ys < ySteps; ys++) {
    const y = THROAT_Y + ((RIM_Y - THROAT_Y) * ys) / (ySteps - 1)
    const rad = funnelRadius(y)
    for (let s = 0; s < ringSegments; s++) {
      const t0 = (s / ringSegments) * Math.PI * 2
      const t1 = ((s + 1) / ringSegments) * Math.PI * 2
      horzRings[hi++] = rad * Math.cos(t0); horzRings[hi++] = y; horzRings[hi++] = rad * Math.sin(t0)
      horzRings[hi++] = rad * Math.cos(t1); horzRings[hi++] = y; horzRings[hi++] = rad * Math.sin(t1)
    }
  }

  return { vertLines, horzRings }
}

// ─────────────────────────────────────────────────────────────────
export default function WormholeFunnel() {
  const rimRingRef    = useRef<THREE.Mesh>(null)
  const throatGlowRef = useRef<THREE.Mesh>(null)

  // ── 격자선 지오메트리 (마운트 시 1회 생성) ──────────────────────
  const { vertGeo, horzGeo } = useMemo(() => {
    const { vertLines, horzRings } = buildFunnelPoints(16, 24)

    const vGeo = new THREE.BufferGeometry()
    vGeo.setAttribute('position', new THREE.BufferAttribute(vertLines, 3))

    const hGeo = new THREE.BufferGeometry()
    hGeo.setAttribute('position', new THREE.BufferAttribute(horzRings, 3))

    return { vertGeo: vGeo, horzGeo: hGeo }
  }, [])

  // ── 입구(Rim) 고리 지오메트리 ─────────────────────────────────
  const rimGeo = useMemo(
    () => new THREE.TorusGeometry(RIM_R, 2.2, 8, 120),
    [],
  )

  // ── 목(Throat) 고리 ────────────────────────────────────────────
  const throatGeo = useMemo(
    () => new THREE.TorusGeometry(THROAT_R + 2, 1.2, 8, 64),
    [],
  )

  // ── 특이점 구 ──────────────────────────────────────────────────
  const singularityGeo = useMemo(
    () => new THREE.SphereGeometry(THROAT_R, 24, 24),
    [],
  )

  // ── 매 프레임: 고리 맥동 ─────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (rimRingRef.current) {
      const pulse = 0.85 + Math.sin(t * 1.2) * 0.15
      ;(rimRingRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
    }
    if (throatGlowRef.current) {
      const pulse2 = 0.5 + Math.sin(t * 2.8 + 1.2) * 0.35
      ;(throatGlowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse2
    }
  })

  // ── 재질 ────────────────────────────────────────────────────────
  const gridMatVert = useMemo(() => new THREE.LineBasicMaterial({
    color:       0x0a3a5a,
    transparent: true,
    opacity:     0.35,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  const gridMatHorz = useMemo(() => new THREE.LineBasicMaterial({
    color:       0x0066aa,
    transparent: true,
    opacity:     0.22,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  const rimMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0x00aaff,
    transparent: true,
    opacity:     0.85,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  const throatMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0xff2200,
    transparent: true,
    opacity:     0.7,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  const singularityMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:      0x000000,
  }), [])

  return (
    <group>
      {/* ── 세로 격자선 ───────────────────────────────────────── */}
      <lineSegments geometry={vertGeo}>
        <primitive object={gridMatVert} attach="material" />
      </lineSegments>

      {/* ── 가로 격자 고리 ───────────────────────────────────── */}
      <lineSegments geometry={horzGeo}>
        <primitive object={gridMatHorz} attach="material" />
      </lineSegments>

      {/* ── 입구 빛 고리 (상단) ──────────────────────────────── */}
      <mesh
        ref={rimRingRef}
        geometry={rimGeo}
        material={rimMat}
        position={[0, RIM_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* ── 목 빛 고리 (하단) ────────────────────────────────── */}
      <mesh
        ref={throatGlowRef}
        geometry={throatGeo}
        material={throatMat}
        position={[0, THROAT_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* ── 특이점 검은 구 ────────────────────────────────────── */}
      <mesh
        geometry={singularityGeo}
        material={singularityMat}
        position={[0, THROAT_Y, 0]}
      />
    </group>
  )
}
