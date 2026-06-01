/**
 * GalaxyCore.tsx — 은하 핵 시각 요소
 *
 * 구성:
 *  1. 갤럭틱 코어 구체 (중심 밝은 구)
 *  2. 내부 글로우 링 (코어 주변 빛 확산)
 *  3. 동심원 궤도 링 (나선팔 구조 가이드)
 *  4. 코어 주변 파티클 구름 (dense center visual)
 *
 * 오픈소스 기여자 관점:
 *  - 링 반지름 = GALAXY_R_INNER 근처 → "이 근처에 가장 활발한 레포들이 있다"는 시각적 힌트
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  GALAXY_R_INNER,
  GALAXY_R_OUTER,
  LANG_ARM_ANGLES,
  LANGUAGE_COLORS,
} from '@/utils/physics'

function makeRingGeo(radius: number, segments = 128): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

export default function GalaxyCore() {
  const coreRef  = useRef<THREE.Mesh>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const haloRef  = useRef<THREE.Group>(null)

  // ── 코어 구체 ─────────────────────────────────────────────────────
  const coreSphere = useMemo(() => new THREE.SphereGeometry(3.5, 20, 20), [])
  const coreMat    = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xfff5cc,
  }), [])

  // ── 내부 글로우 (큰 반투명 구) ────────────────────────────────────
  const glowSphere = useMemo(() => new THREE.SphereGeometry(10, 16, 16), [])
  const glowMat    = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0xffd080,
    transparent: true,
    opacity:     0.08,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
    side:        THREE.BackSide,
  }), [])

  // ── 코어 동심원 링 ────────────────────────────────────────────────
  const coreRings = useMemo(() => {
    const layers = [
      { r: 6,  color: 0xffeebb, opacity: 0.85 },
      { r: 10, color: 0xffdd88, opacity: 0.55 },
      { r: 15, color: 0xffcc66, opacity: 0.35 },
      { r: 22, color: 0xff9944, opacity: 0.22 },
      { r: 30, color: 0xff7722, opacity: 0.14 },
    ]
    return layers.map(({ r, color, opacity }) => {
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      return new THREE.LineLoop(makeRingGeo(r), mat)
    })
  }, [])

  // ── 활동 반지름 링 (기여자에게 "이 안쪽이 핵심 레포"라는 안내) ────
  const activityRings = useMemo(() => {
    const zones = [
      // 매우 활발 (inner)
      { r: GALAXY_R_INNER * 1.5,  color: 0x00ff88, opacity: 0.18, label: 'active' },
      { r: GALAXY_R_INNER * 3,    color: 0x00d4ff, opacity: 0.14 },
      { r: GALAXY_R_INNER * 5,    color: 0x0088cc, opacity: 0.09 },
      // 외곽 (inactive)
      { r: GALAXY_R_OUTER * 0.75, color: 0x0033aa, opacity: 0.07 },
      { r: GALAXY_R_OUTER,        color: 0x002288, opacity: 0.05 },
    ]
    return zones.map(({ r, color, opacity }) => {
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      return new THREE.LineLoop(makeRingGeo(r), mat)
    })
  }, [])

  // ── 나선팔 방향선 (언어별 색상 방사선) ──────────────────────────
  const armLines = useMemo(() => {
    const group = new THREE.Group()
    Object.entries(LANG_ARM_ANGLES).forEach(([lang, baseAngle]) => {
      const color = LANGUAGE_COLORS[lang] ?? '#445566'
      // 나선팔 줄기: 안쪽부터 바깥쪽까지 점으로 표현
      const pts: THREE.Vector3[] = []
      const steps = 40
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const r = GALAXY_R_INNER * 0.8 + (GALAXY_R_OUTER * 0.95 - GALAXY_R_INNER * 0.8) * t
        // 나선팔 각도 공식 (physics.ts의 spiralTheta와 일치)
        const theta = baseAngle + 0.55 * Math.log(Math.max(1, r / GALAXY_R_INNER) + 1)
        pts.push(new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta)))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color:       new THREE.Color(color),
        transparent: true,
        opacity:     0.08,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })
      group.add(new THREE.Line(geo, mat))
    })
    return group
  }, [])

  // ── 매 프레임: 코어 맥동 ──────────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (coreRef.current) {
      const pulse = 0.9 + Math.sin(t * 1.8) * 0.1
      coreRef.current.scale.setScalar(pulse)
    }
    if (glowRef.current) {
      const gpulse = 0.7 + Math.sin(t * 0.9 + 1.2) * 0.3
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = gpulse * 0.08
    }
    if (haloRef.current) {
      // 코어 링 천천히 회전
      haloRef.current.rotation.y = t * 0.04
    }
  })

  return (
    <group>
      {/* 코어 구체 */}
      <mesh ref={coreRef} geometry={coreSphere} material={coreMat} />

      {/* 코어 글로우 */}
      <mesh ref={glowRef} geometry={glowSphere} material={glowMat} />

      {/* 코어 링 그룹 */}
      <group ref={haloRef}>
        {coreRings.map((ring, i) => <primitive key={i} object={ring} />)}
      </group>

      {/* 활동 반지름 링 */}
      {activityRings.map((ring, i) => <primitive key={i} object={ring} />)}

      {/* 언어별 나선팔 가이드 선 */}
      <primitive object={armLines} />
    </group>
  )
}
