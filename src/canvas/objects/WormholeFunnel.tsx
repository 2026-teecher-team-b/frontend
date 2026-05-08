/**
 * WormholeFunnel.tsx — 깔때기(Wormhole) 시각 구조물
 *
 * 구성:
 *  1. 격자선(Grid)     : 24개 세로선 + 16개 가로 원호 → 깔때기 그물망
 *  2. 입구 빛 고리     : RIM_Y(= 격자 높이)에 평면 동심원 라인 → 지평선과 매끄럽게 연결
 *  3. 특이점(목)       : 하단 좁은 목의 검은 구 + 빨간 고리
 *
 * 수학:
 *  r(y) = THROAT_R + (RIM_R - THROAT_R) * ((y-THROAT_Y)/(RIM_Y-THROAT_Y))^EXPONENT
 *
 * 지평선 연결:
 *  InfiniteGrid의 GRID_Y = RIM_Y로 맞춰져 있으므로
 *  WormholeFunnel 상단 고리도 Y = RIM_Y에 위치 → 같은 평면에 녹아들어
 *  깔때기가 지평선에 파여있는 것처럼 보인다.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  RIM_Y, THROAT_Y, RIM_R, THROAT_R, funnelRadius,
} from '@/utils/physics'

// ── 격자선 생성 헬퍼 ─────────────────────────────────────────────

function buildFunnelPoints(
  ySteps: number,
  radialSteps: number,
): { vertLines: Float32Array; horzRings: Float32Array } {
  const vertCount = radialSteps * (ySteps - 1) * 2
  const vertLines = new Float32Array(vertCount * 3)

  let vi = 0
  for (let r = 0; r < radialSteps; r++) {
    const theta = (r / radialSteps) * Math.PI * 2
    for (let ys = 0; ys < ySteps - 1; ys++) {
      const y0 = THROAT_Y + ((RIM_Y - THROAT_Y) * ys)       / (ySteps - 1)
      const y1 = THROAT_Y + ((RIM_Y - THROAT_Y) * (ys + 1)) / (ySteps - 1)
      const r0 = funnelRadius(y0)
      const r1 = funnelRadius(y1)
      vertLines[vi++] = r0 * Math.cos(theta); vertLines[vi++] = y0; vertLines[vi++] = r0 * Math.sin(theta)
      vertLines[vi++] = r1 * Math.cos(theta); vertLines[vi++] = y1; vertLines[vi++] = r1 * Math.sin(theta)
    }
  }

  const ringSegments = 64
  const horzCount = ySteps * ringSegments * 2
  const horzRings = new Float32Array(horzCount * 3)

  let hi = 0
  for (let ys = 0; ys < ySteps; ys++) {
    const y   = THROAT_Y + ((RIM_Y - THROAT_Y) * ys) / (ySteps - 1)
    const rad = funnelRadius(y)
    for (let s = 0; s < ringSegments; s++) {
      const t0 = (s / ringSegments)       * Math.PI * 2
      const t1 = ((s + 1) / ringSegments) * Math.PI * 2
      horzRings[hi++] = rad * Math.cos(t0); horzRings[hi++] = y; horzRings[hi++] = rad * Math.sin(t0)
      horzRings[hi++] = rad * Math.cos(t1); horzRings[hi++] = y; horzRings[hi++] = rad * Math.sin(t1)
    }
  }

  return { vertLines, horzRings }
}

// ── 원 라인 지오메트리 헬퍼 ──────────────────────────────────────
function makeCircleGeo(radius: number, segments = 128): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

// ─────────────────────────────────────────────────────────────────
export default function WormholeFunnel() {
  const throatGlowRef = useRef<THREE.Mesh>(null)

  // ── 격자선 지오메트리 ──────────────────────────────────────────
  const { vertGeo, horzGeo } = useMemo(() => {
    const { vertLines, horzRings } = buildFunnelPoints(16, 24)
    const vGeo = new THREE.BufferGeometry()
    vGeo.setAttribute('position', new THREE.BufferAttribute(vertLines, 3))
    const hGeo = new THREE.BufferGeometry()
    hGeo.setAttribute('position', new THREE.BufferAttribute(horzRings, 3))
    return { vertGeo: vGeo, horzGeo: hGeo }
  }, [])

  // ── 입구 글로우 동심원 (평면 라인, Y=RIM_Y) ───────────────────
  // 토러스(입체 링) 대신 평면 원 라인을 사용해 지평선과 동일 평면에 놓는다
  const rimCircles = useMemo(() => {
    // 안쪽부터 바깥으로 퍼지는 글로우 레이어
    const layers = [
      { r: RIM_R * 0.88, color: 0xaaeeff, opacity: 0.45 },
      { r: RIM_R * 0.94, color: 0x77ddff, opacity: 0.70 },
      { r: RIM_R,        color: 0x44ccff, opacity: 1.00 },  // 핵심 경계선
      { r: RIM_R * 1.06, color: 0x22bbff, opacity: 0.70 },
      { r: RIM_R * 1.14, color: 0x11aaee, opacity: 0.45 },
      { r: RIM_R * 1.26, color: 0x0088cc, opacity: 0.25 },
      { r: RIM_R * 1.45, color: 0x005599, opacity: 0.12 },
    ]
    return layers.map(({ r, color, opacity }) => ({
      geo: makeCircleGeo(r),
      mat: new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending:   THREE.AdditiveBlending,
      }),
    }))
  }, [])

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

  // ── 매 프레임: 목 고리 맥동 ──────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (throatGlowRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.8 + 1.2) * 0.35
      ;(throatGlowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
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

  const throatMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0xff2200,
    transparent: true,
    opacity:     0.7,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  const singularityMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x000000,
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

      {/* ── 입구 평면 글로우 링 (지평선과 같은 Y=RIM_Y 평면) ─ */}
      {rimCircles.map(({ geo, mat }, i) => (
        <line key={i} geometry={geo} position={[0, RIM_Y, 0]}>
          <primitive object={mat} attach="material" />
        </line>
      ))}

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
