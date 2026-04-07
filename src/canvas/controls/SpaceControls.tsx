/**
 * SpaceControls.tsx
 *
 * 넓은 우주 공간을 탐험하는 카메라 컨트롤.
 * OrbitControls(한 점 고정 회전)와 달리 카메라 자체가 공간을 이동한다.
 *
 * 인터랙션:
 *  - 좌클릭 드래그 → X/Y 방향 패닝 (우주 이동)
 *  - 스크롤 휠    → Z 방향 줌인/아웃
 *  - 드래그 해제 후 → 관성(inertia) 적용, 서서히 감속
 *  - 터치 드래그  → 패닝
 *  - 터치 핀치    → 줌인/아웃
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

// ── 카메라 이동 한계 ──────────────────────────
const BOUNDS_XY = 600    // X/Y 이동 최대 범위
const MIN_Z = 25         // 줌인 최소 거리
const MAX_Z = 700        // 줌아웃 최대 거리
const INERTIA_DECAY = 0.88 // 관성 감쇠 계수 (0~1, 높을수록 더 오래 미끄러짐)
const INERTIA_STOP = 0.05  // 이 값 이하면 속도 0으로 고정

export default function SpaceControls() {
  const { camera, gl } = useThree()

  // 드래그 상태
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // 관성 속도 (frame마다 카메라에 적용 후 감쇠)
  const velocity = useRef({ x: 0, y: 0 })

  // 터치 핀치 줌 — 이전 두 손가락 거리
  const lastPinchDist = useRef<number | null>(null)

  // ── 패닝 계수 계산 ─────────────────────────
  // 멀리 있을수록(Z 클수록) 같은 픽셀 이동에 더 많이 이동해야 자연스럽다
  const getPanFactor = () => {
    return camera.position.z / (window.innerHeight * 1.2)
  }

  // ── 매 프레임: 관성 적용 + 경계 클램핑 ─────
  useFrame(() => {
    if (!isDragging.current) {
      camera.position.x += velocity.current.x
      camera.position.y += velocity.current.y

      velocity.current.x *= INERTIA_DECAY
      velocity.current.y *= INERTIA_DECAY

      // 아주 작은 값은 0으로 끊기
      if (Math.abs(velocity.current.x) < INERTIA_STOP) velocity.current.x = 0
      if (Math.abs(velocity.current.y) < INERTIA_STOP) velocity.current.y = 0
    }

    // 경계 클램핑
    camera.position.x = Math.max(-BOUNDS_XY, Math.min(BOUNDS_XY, camera.position.x))
    camera.position.y = Math.max(-BOUNDS_XY, Math.min(BOUNDS_XY, camera.position.y))
    camera.position.z = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z))
  })

  // ── 이벤트 리스너 등록/해제 ─────────────────
  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.cursor = 'grab'

    // ── 마우스 ──────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // 좌클릭만
      isDragging.current = true
      velocity.current = { x: 0, y: 0 } // 드래그 시작 시 관성 초기화
      lastMouse.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      const factor = getPanFactor()

      const vx = -dx * factor
      const vy = dy * factor

      camera.position.x += vx
      camera.position.y += vy
      // 관성을 위해 현재 속도 기록
      velocity.current = { x: vx, y: vy }

      lastMouse.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging.current = false
      canvas.style.cursor = 'grab'
    }

    // ── 휠 줌 ───────────────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // trackpad pinch는 deltaY가 작고 deltaMode=0, 마우스 휠은 크다
      const factor = e.ctrlKey ? 0.003 : 0.0012
      const zoomMultiplier = 1 + e.deltaY * factor
      camera.position.z = Math.max(
        MIN_Z,
        Math.min(MAX_Z, camera.position.z * zoomMultiplier),
      )
    }

    // ── 터치 (모바일) ─────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true
        velocity.current = { x: 0, y: 0 }
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        // 핀치 시작 — 두 손가락 거리 저장
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
        const factor = getPanFactor()

        const vx = -dx * factor
        const vy = dy * factor
        camera.position.x += vx
        camera.position.y += vy
        velocity.current = { x: vx, y: vy }
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        // 핀치 줌
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = lastPinchDist.current / dist // 줄어들면 >1 (줌아웃)
        camera.position.z = Math.max(MIN_Z, Math.min(MAX_Z, camera.position.z * ratio))
        lastPinchDist.current = dist
      }
    }

    const onTouchEnd = () => {
      isDragging.current = false
      lastPinchDist.current = null
    }

    // 등록
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
