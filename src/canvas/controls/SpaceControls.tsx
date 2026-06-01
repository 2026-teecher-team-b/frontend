/**
 * SpaceControls.tsx — 궤도형(Orbit) 카메라 컨트롤
 *
 * 인터랙션:
 *  - 좌클릭 드래그 좌우 → Y축 중심 공전 (azimuth θ)
 *  - 좌클릭 드래그 상하 → 앙각 조절 (elevation φ)
 *  - 마우스 휠                → 줌인/아웃 (radius)
 *  - 트랙패드 두 손가락 스크롤  → 줌인/아웃
 *  - 트랙패드 핀치 (ctrlKey)   → 줌인/아웃 (높은 감도)
 *  - 드래그 해제 후            → 회전 관성
 *
 * 카메라 포커스:
 *  - followedRepoId == null  → lookAt 타겟을 깔때기 중심(0,0,0)으로 lerp
 *  - followedRepoId != null  → lookAt 타겟을 해당 별 위치로 lerp (star 클릭/검색)
 *  - 패널 닫기(X / 외부 클릭) → closePanel() 호출 → followedRepoId = null → 중심 복귀
 *
 * 내부 구조:
 *  spherical = { theta, phi, radius }
 *  lookTarget = 현재 orbit 중심 (부드럽게 lerp)
 *  camera.position = lookTarget + (r·cosφ·cosθ, r·sinφ, r·cosφ·sinθ)
 *  camera.lookAt(lookTarget) 매 프레임 적용
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useUIStore } from '@/store/useUIStore'
import { physicsStore } from '@/store/physicsStore'

// ── 드래그 여부 외부 공유 ──────────────────────────────────────────
// Scene.tsx의 onPointerMissed에서 드래그 직후 패널이 닫히는 걸 방지한다.
let _dragMoved = false
export function wasPointerDrag(): boolean { return _dragMoved }

// ── 상수 ──────────────────────────────────────────────────────────
const ROTATION_SPEED   = 0.0040   // rad / px
const MIN_PHI          = 0.04     // 최소 앙각 (거의 수평)
const MAX_PHI          = Math.PI / 2 - 0.01  // 최대 앙각 (~89°, 거의 수직)
const MIN_RADIUS       = 60
const MAX_RADIUS       = 900
const INERTIA_DECAY    = 0.88
const INERTIA_STOP     = 0.000_05
const TARGET_LERP      = 0.055    // lookAt 타겟 보간 속도
const RADIUS_LERP      = 0.06     // 줌 보간 속도
const FOCUS_RADIUS     = 100      // 별 클릭 시 자동 줌인 거리

// 초기 카메라 위치 [0, 150, 280] → 구면 좌표
const INIT_RADIUS = Math.sqrt(150 * 150 + 280 * 280)  // ≈ 317
const INIT_THETA  = Math.PI / 2                         // atan2(280, 0) = π/2
const INIT_PHI    = Math.atan2(150, 280)               // ≈ 0.49 rad

// 2D 모드: 거의 수직으로 내려다보는 앙각
const PHI_2D = Math.PI / 2 - 0.01
const RADIUS_2D = 320

export default function SpaceControls() {
  const { camera, gl } = useThree()

  // 구면 좌표 상태 (orbit 반지름·각도)
  const sph = useRef({ theta: INIT_THETA, phi: INIT_PHI, radius: INIT_RADIUS })

  // 줌 목표값 — 휠/핀치와 자동 포커스가 함께 수정한다
  const radiusTarget = useRef(INIT_RADIUS)
  // 이전 followedRepoId — 전환 감지용
  const prevFollowedId = useRef<number | null>(null)

  // 별 클릭 직전 카메라 상태 스냅샷 — 닫을 때 복원
  const savedSph = useRef<{ theta: number; phi: number; radius: number } | null>(null)

  // 카메라가 실제로 바라보는 orbit 중심 (lerp로 부드럽게 이동)
  const lookTarget    = useRef(new THREE.Vector3(0, 0, 0))
  // 현재 목표 orbit 중심 (desired)
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0))

  // 드래그 상태
  const isDragging = useRef(false)
  const lastMouse  = useRef({ x: 0, y: 0 })

  // 회전 관성 속도
  const vel = useRef({ theta: 0, phi: 0 })

  // 터치 핀치
  const lastPinchDist = useRef<number | null>(null)

  // ── 매 프레임 ─────────────────────────────────────────────────────
  useFrame(() => {
    const viewMode = useUIStore.getState().viewMode

    // ── 2D 모드: φ 를 수직으로 고정, radius 목표 설정 ──────────────
    if (viewMode === '2d') {
      sph.current.phi = PHI_2D
      vel.current.phi = 0
      if (radiusTarget.current > RADIUS_2D) radiusTarget.current = RADIUS_2D
    }

    // ── 1. 관성 반영 ──────────────────────────────────────────────
    if (!isDragging.current) {
      sph.current.theta += vel.current.theta
      if (viewMode === '3d') {
        sph.current.phi += vel.current.phi
      }
      vel.current.theta *= INERTIA_DECAY
      vel.current.phi   *= INERTIA_DECAY
      if (Math.abs(vel.current.theta) < INERTIA_STOP) vel.current.theta = 0
      if (Math.abs(vel.current.phi)   < INERTIA_STOP) vel.current.phi   = 0
    }

    // φ 클램핑 (3D 모드에서만 적용)
    if (viewMode === '3d') {
      sph.current.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, sph.current.phi))
    }

    // ── 2. lookAt 타겟 결정 + 자동 줌인/아웃 ─────────────────────
    const followedId = useUIStore.getState().followedRepoId

    if (followedId !== null) {
      const entry = physicsStore.entries.get(followedId)
      desiredTarget.current.copy(entry ? entry.position : new THREE.Vector3(0, 0, 0))

      // null → non-null 전환: 클릭 직전 상태 저장 + 자동 줌인
      if (prevFollowedId.current === null) {
        savedSph.current = { ...sph.current, radius: radiusTarget.current }
        radiusTarget.current = FOCUS_RADIUS
      }
    } else {
      desiredTarget.current.set(0, 0, 0)

      // non-null → null 전환: 저장된 위치로 복원
      if (prevFollowedId.current !== null && savedSph.current !== null) {
        sph.current.theta  = savedSph.current.theta
        sph.current.phi    = savedSph.current.phi
        radiusTarget.current = savedSph.current.radius
        savedSph.current = null
      }
    }
    prevFollowedId.current = followedId

    // lookAt 부드럽게 lerp
    lookTarget.current.lerp(desiredTarget.current, TARGET_LERP)

    // radius 부드럽게 lerp (휠/핀치는 radiusTarget을 직접 수정)
    sph.current.radius += (radiusTarget.current - sph.current.radius) * RADIUS_LERP
    sph.current.radius  = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, sph.current.radius))

    // ── 3. 카메라 위치 = lookTarget + 구면 오프셋 ──────────────────
    const { theta, phi, radius } = sph.current
    const cosPhi = Math.cos(phi)
    camera.position.set(
      lookTarget.current.x + radius * cosPhi * Math.cos(theta),
      lookTarget.current.y + radius * Math.sin(phi),
      lookTarget.current.z + radius * cosPhi * Math.sin(theta),
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(lookTarget.current)
  })

  // ── 이벤트 ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.cursor = 'grab'

    // ── 마우스 ──────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      _dragMoved = false   // 새 인터랙션 시작 시 초기화
      vel.current = { theta: 0, phi: 0 }
      lastMouse.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      // 3px 이상 움직이면 '드래그'로 판정 → onPointerMissed 무시
      if (Math.sqrt(dx * dx + dy * dy) > 3) _dragMoved = true

      const dTheta = dx * ROTATION_SPEED
      const dPhi   = -dy * ROTATION_SPEED

      const is2D = useUIStore.getState().viewMode === '2d'
      sph.current.theta += dTheta
      if (!is2D) {
        sph.current.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, sph.current.phi + dPhi))
      }

      vel.current = { theta: dTheta, phi: is2D ? 0 : dPhi }
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging.current = false
      canvas.style.cursor = 'grab'
    }

    // ── 휠 / 트랙패드 줌 ────────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // ctrlKey=true → 트랙패드 핀치 제스처 (민감하게)
      // ctrlKey=false → 두 손가락 스크롤 or 마우스 휠
      const factor = e.ctrlKey ? 0.020 : 0.004
      // radiusTarget 수정 → 다음 프레임에 sph.radius가 lerp로 따라옴
      radiusTarget.current = Math.max(
        MIN_RADIUS,
        Math.min(MAX_RADIUS, radiusTarget.current * (1 + e.deltaY * factor)),
      )
    }

    // ── 터치 (모바일) ───────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true
        vel.current = { theta: 0, phi: 0 }
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.hypot(dx, dy)
        isDragging.current = false
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isDragging.current) {
        const dx = e.touches[0].clientX - lastMouse.current.x
        const dy = e.touches[0].clientY - lastMouse.current.y
        const dTheta = dx * ROTATION_SPEED
        const dPhi   = -dy * ROTATION_SPEED
        sph.current.theta += dTheta
        sph.current.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, sph.current.phi + dPhi))
        vel.current = { theta: dTheta, phi: dPhi }
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist  = Math.hypot(dx, dy)
        const ratio = lastPinchDist.current / dist
        radiusTarget.current = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radiusTarget.current * ratio))
        lastPinchDist.current = dist
      }
    }

    const onTouchEnd = () => {
      isDragging.current = false
      lastPinchDist.current = null
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.style.cursor = ''
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [camera, gl]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
