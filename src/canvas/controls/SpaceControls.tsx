/**
 * SpaceControls.tsx — 360° 구형 좌표계 오비탈 카메라 (v2)
 *
 * 좌표계:
 *   camera.position = target + sphere(theta, phi, radius)
 *   theta  = 방위각 (Y축 중심, 제한 없음 → 360° 수평 회전)
 *   phi    = 앙각   (0 = 위쪽, π = 아래쪽, 극점 제외 전체 범위)
 *   radius = 카메라 ↔ target 거리 (줌)
 *   target = 카메라가 바라보는 3D 공간의 한 점 (팬으로 자유 이동)
 *
 * 인터랙션:
 *   좌드래그 → 360° 오비트
 *   우드래그 → target 팬 (고정 중심 없는 자유 탐험)
 *   스크롤   → 줌인/아웃 (lerp로 부드럽게)
 *   관성     → 드래그 해제 후 서서히 감속
 *   별 클릭  → 해당 별 추적 + 줌인 (followedRepoId)
 *   X 클릭 / 빈 화면 클릭 → 추적 해제 + 전체 뷰로 부드럽게 줌아웃
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { physicsStore } from '@/store/physicsStore'
import { useUIStore } from '@/store/useUIStore'

// ── 상수 ──────────────────────────────────────────────────────────
const MIN_RADIUS          = 15
const MAX_RADIUS          = 900
const DEFAULT_RADIUS      = 220    // 추적 해제 시 복귀할 기본 거리
const FOLLOW_RADIUS       = 45     // 별 추적 시 목표 거리
const ORBIT_SENS          = 0.004
const PAN_SENS            = 0.0012
const ZOOM_SENS           = 0.0012
const INERTIA_DECAY       = 0.90
const INERTIA_STOP        = 0.00015
const FOLLOW_LERP         = 5      // 별 추적 target 이동 속도
const ZOOM_LERP           = 7      // 줌 lerp 속도

// ─────────────────────────────────────────────────────────────────
export default function SpaceControls() {
  const { camera, gl } = useThree()

  // ── Zustand: 별 추적 상태 (ref로 동기화 → useEffect 재등록 방지) ─
  const followedRepoId      = useUIStore((s) => s.followedRepoId)
  const setCameraFollow     = useUIStore((s) => s.setCameraFollow)
  const followedRepoIdRef   = useRef<number | null>(null)
  const setCameraFollowRef  = useRef(setCameraFollow)
  followedRepoIdRef.current  = followedRepoId
  setCameraFollowRef.current = setCameraFollow

  // ── 구형 좌표 refs ────────────────────────────────────────────
  // phi = π/2.8 → 약간 위에서 내려다보는 각도 (깔때기 전체가 보임)
  // target = (0, -20, 0) → 깔때기 중간 높이를 바라봄
  const thetaRef        = useRef(0)
  const phiRef          = useRef(Math.PI / 2.8)
  const radiusRef       = useRef(DEFAULT_RADIUS)
  const targetRadiusRef = useRef(DEFAULT_RADIUS)
  const targetRef       = useRef(new THREE.Vector3(0, -20, 0))

  // ── 드래그 / 관성 ────────────────────────────────────────────
  const dragModeRef   = useRef<'orbit' | 'pan' | null>(null)
  const lastMouseRef  = useRef({ x: 0, y: 0 })
  const orbitVelRef   = useRef({ theta: 0, phi: 0 })

  // ── 이전 follow 값 (release 감지용) ─────────────────────────
  const prevFollowedRef = useRef<number | null>(null)

  // ── 헬퍼: 카메라 위치·방향 적용 ─────────────────────────────
  const applyCamera = () => {
    const r = radiusRef.current
    const t = thetaRef.current
    const p = phiRef.current
    const tgt = targetRef.current
    camera.position.set(
      tgt.x + r * Math.sin(p) * Math.sin(t),
      tgt.y + r * Math.cos(p),
      tgt.z + r * Math.sin(p) * Math.cos(t),
    )
    camera.lookAt(tgt)
  }

  // ── 헬퍼: 팬용 right/up 벡터 ─────────────────────────────────
  const getRightUp = () => {
    const t = thetaRef.current
    const p = phiRef.current
    const right = new THREE.Vector3(Math.cos(t), 0, -Math.sin(t))
    const up    = new THREE.Vector3(
      -Math.sin(t) * Math.cos(p),
       Math.sin(p),
      -Math.cos(t) * Math.cos(p),
    )
    return { right, up }
  }

  // ── 매 프레임 루프 ────────────────────────────────────────────
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    // 1. 추적 해제 감지 → 전체 뷰로 줌아웃
    const currFollow = followedRepoIdRef.current
    if (prevFollowedRef.current !== null && currFollow === null) {
      targetRadiusRef.current = DEFAULT_RADIUS
      // target을 서서히 원점 방향으로 되돌리지는 않음 (갑작스러운 점프 방지)
      // radius만 넓히면 자연스럽게 전체 뷰가 보임
    }
    prevFollowedRef.current = currFollow

    // 2. 줌 lerp
    radiusRef.current += (targetRadiusRef.current - radiusRef.current) * Math.min(ZOOM_LERP * dt, 1)
    radiusRef.current = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, radiusRef.current))

    // 3. 별 추적
    if (currFollow !== null) {
      const entry = physicsStore.entries.get(currFollow)
      if (entry) {
        targetRef.current.lerp(entry.position, Math.min(FOLLOW_LERP * dt, 1))
        targetRadiusRef.current += (FOLLOW_RADIUS - targetRadiusRef.current) * Math.min(4 * dt, 1)
      }
    }

    // 4. 오비트 관성
    if (dragModeRef.current === null) {
      thetaRef.current += orbitVelRef.current.theta
      phiRef.current   += orbitVelRef.current.phi
      orbitVelRef.current.theta *= INERTIA_DECAY
      orbitVelRef.current.phi   *= INERTIA_DECAY
      if (Math.abs(orbitVelRef.current.theta) < INERTIA_STOP) orbitVelRef.current.theta = 0
      if (Math.abs(orbitVelRef.current.phi)   < INERTIA_STOP) orbitVelRef.current.phi   = 0
    }

    // 5. phi 클램핑 (극점 gimbal lock 방지)
    phiRef.current = Math.max(0.05, Math.min(Math.PI - 0.05, phiRef.current))

    // 6. 카메라 적용
    applyCamera()
  })

  // ── 이벤트 등록 (마운트 시 1회) ──────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.cursor = 'grab'

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragModeRef.current = 'orbit'
        // 오비트 드래그 시작 → 별 추적 해제
        if (followedRepoIdRef.current !== null) {
          setCameraFollowRef.current(null)
        }
      } else if (e.button === 2) {
        dragModeRef.current = 'pan'
      } else {
        return
      }
      orbitVelRef.current = { theta: 0, phi: 0 }
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragModeRef.current) return
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y

      if (dragModeRef.current === 'orbit') {
        const dTheta = -dx * ORBIT_SENS
        const dPhi   = -dy * ORBIT_SENS
        thetaRef.current += dTheta
        phiRef.current   += dPhi
        orbitVelRef.current = { theta: dTheta, phi: dPhi }
      } else if (dragModeRef.current === 'pan') {
        const { right, up } = getRightUp()
        const scale = radiusRef.current * PAN_SENS
        targetRef.current.addScaledVector(right,  dx * scale)
        targetRef.current.addScaledVector(up,    -dy * scale)
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      dragModeRef.current = null
      canvas.style.cursor = 'grab'
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.ctrlKey ? 0.005 : ZOOM_SENS
      targetRadiusRef.current = Math.max(
        MIN_RADIUS,
        Math.min(MAX_RADIUS, targetRadiusRef.current * (1 + e.deltaY * factor)),
      )
    }

    const onContextMenu = (e: Event) => e.preventDefault()

    // ── 터치 ─────────────────────────────────────────────────
    let lastPinchDist: number | null = null

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragModeRef.current = 'orbit'
        orbitVelRef.current = { theta: 0, phi: 0 }
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        if (followedRepoIdRef.current !== null) setCameraFollowRef.current(null)
      } else if (e.touches.length === 2) {
        dragModeRef.current = null
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.hypot(dx, dy)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && dragModeRef.current === 'orbit') {
        const dx = e.touches[0].clientX - lastMouseRef.current.x
        const dy = e.touches[0].clientY - lastMouseRef.current.y
        const dTheta = -dx * ORBIT_SENS
        const dPhi   = -dy * ORBIT_SENS
        thetaRef.current += dTheta
        phiRef.current   += dPhi
        orbitVelRef.current = { theta: dTheta, phi: dPhi }
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2 && lastPinchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        targetRadiusRef.current = Math.max(
          MIN_RADIUS,
          Math.min(MAX_RADIUS, targetRadiusRef.current * (lastPinchDist / dist)),
        )
        lastPinchDist = dist
      }
    }

    const onTouchEnd = () => {
      dragModeRef.current = null
      lastPinchDist = null
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.style.cursor = ''
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [gl]) // gl만 deps (followedRepoId는 ref로 처리)

  return null
}
