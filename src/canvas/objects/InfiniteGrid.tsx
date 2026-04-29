/**
 * InfiniteGrid.tsx — 상단 무한 우주 격자
 *
 * 깔때기 입구(RIM_Y) 바로 위에 XZ평면 격자를 그려
 * 우주 공간이 무한하게 펼쳐지는 느낌을 준다.
 *
 * 구현:
 *  - 큰 GridHelper (4000×4000, 200칸) + 엣지 페이드
 *  - 중심에서 멀어질수록 투명해지는 방사형 페이드 (Fog 대체)
 *  - 크기 큰 격자(400칸) + 작은 격자(40칸) 2레이어로 원근감 강조
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { RIM_Y } from '@/utils/physics'

// 격자를 방사형으로 페이드시키는 커스텀 LineMaterial 대신
// 여러 개의 GridHelper를 alpha가 다르게 쌓는 방식 사용

const GRID_Y = RIM_Y + 8  // 깔때기 입구 바로 위

export default function InfiniteGrid() {
  // ── 큰 격자 (넓고 성긴) ─────────────────────────────────────────
  const bigGrid = useMemo(() => {
    const helper = new THREE.GridHelper(4000, 100, 0x0a2a4a, 0x061828)
    // GridHelper의 material을 투명하게
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material]
    mats.forEach((m) => {
      m.transparent = true
      m.opacity     = 0.25
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
      m.opacity     = 0.18
      m.depthWrite  = false
      ;(m as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    })
    helper.position.y = GRID_Y + 0.5
    return helper
  }, [])

  // ── 수평선 강조 원 (동심원 몇 겹) ───────────────────────────────
  const horizonRings = useMemo(() => {
    const group = new THREE.Group()
    const radii = [200, 400, 600, 900, 1200, 1600, 2000]
    radii.forEach((r, idx) => {
      const curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0)
      const pts   = curve.getPoints(128)
      const geo   = new THREE.BufferGeometry().setFromPoints(
        pts.map((p) => new THREE.Vector3(p.x, 0, p.y)),
      )
      const alpha = Math.max(0.03, 0.20 - idx * 0.025)
      const mat   = new THREE.LineBasicMaterial({
        color:       0x0088cc,
        transparent: true,
        opacity:     alpha,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })
      const line = new THREE.LineLoop(geo, mat)
      group.add(line)
    })
    group.position.y = GRID_Y + 1
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
