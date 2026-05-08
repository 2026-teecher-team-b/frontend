/**
 * InfiniteGrid.tsx — 상단 무한 우주 격자 + 선명한 수평선
 *
 * GRID_Y = RIM_Y: 깔때기 입구와 동일 높이로 맞춰
 * 수평선이 깔때기 테두리와 같은 평면에 놓여 자연스럽게 연결된다.
 *
 * 구성:
 *  - BigGrid (4000×4000, 성긴 격자)
 *  - SmallGrid (1200×1200, 촘촘한 격자)
 *  - HorizonRings: 동심원 → 안쪽(깔때기 입구 근처)일수록 선명하게
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { RIM_R, RIM_Y } from '@/utils/physics'

// 깔때기 입구와 같은 높이 (기존 RIM_Y+8에서 변경)
const GRID_Y = RIM_Y

export default function InfiniteGrid() {
  // ── 큰 격자 (넓고 성긴) ─────────────────────────────────────────
  const bigGrid = useMemo(() => {
    const helper = new THREE.GridHelper(4000, 100, 0x0a2a4a, 0x061828)
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material]
    mats.forEach((m) => {
      m.transparent = true
      m.opacity     = 0.22
      m.depthWrite  = false
      ;(m as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    })
    helper.position.y = GRID_Y
    return helper
  }, [])

  // ── 작은 격자 (촘촘) ─────────────────────────────────────────────
  const smallGrid = useMemo(() => {
    const helper = new THREE.GridHelper(1200, 200, 0x0066aa, 0x003355)
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material]
    mats.forEach((m) => {
      m.transparent = true
      m.opacity     = 0.15
      m.depthWrite  = false
      ;(m as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    })
    helper.position.y = GRID_Y
    return helper
  }, [])

  // ── 수평선 강조 동심원 ───────────────────────────────────────────
  // 깔때기 입구(RIM_R ≈ 195)에서 시작, 안쪽일수록 극도로 밝게
  const horizonRings = useMemo(() => {
    const group = new THREE.Group()

    const rings = [
      // 깔때기 입구 바로 안쪽 — 가장 밝은 경계선
      { r: RIM_R * 0.92, color: 0x88eeff, opacity: 0.75 },
      // 입구 정확히
      { r: RIM_R,        color: 0x55ddff, opacity: 0.95 },
      // 입구 바로 바깥 — 지평선으로 번지는 글로우
      { r: RIM_R * 1.10, color: 0x33ccff, opacity: 0.65 },
      { r: RIM_R * 1.25, color: 0x22bbee, opacity: 0.45 },
      { r: RIM_R * 1.55, color: 0x1199cc, opacity: 0.30 },
      { r: RIM_R * 2.10, color: 0x0077aa, opacity: 0.18 },
      { r: RIM_R * 3.00, color: 0x005588, opacity: 0.10 },
      { r: RIM_R * 4.50, color: 0x003366, opacity: 0.05 },
      { r: RIM_R * 6.50, color: 0x002244, opacity: 0.03 },
    ]

    rings.forEach(({ r, color, opacity }) => {
      const segments = 128
      const curve    = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0)
      const pts      = curve.getPoints(segments)
      const geo      = new THREE.BufferGeometry().setFromPoints(
        pts.map((p) => new THREE.Vector3(p.x, 0, p.y)),
      )
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })
      group.add(new THREE.LineLoop(geo, mat))
    })

    group.position.y = GRID_Y
    return group
  }, [])

  return (
    <>
      <primitive object={bigGrid} />
      <primitive object={smallGrid} />
      <primitive object={horizonRings} />
    </>
  )
}
