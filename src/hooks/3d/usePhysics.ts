/**
 * usePhysics.ts — N-body 물리 시뮬레이션
 *
 * Scene.tsx 내부(Canvas 안)에서 단 한 번 호출한다.
 * physicsStore의 모든 별에 대해 매 프레임(2프레임마다 1회) 힘을 계산,
 * 속도/위치를 갱신하고 Three.js 메시에 직접 적용한다.
 * React 리렌더 없음 → 프레임 드랍 없이 50개 별 실시간 이동.
 *
 * 힘 구성:
 *  1. 홈 스프링  : 드리프팅 성단 중심을 향한 복원력
 *  2. N-body   : 같은 언어 = 인력, 모든 별 = 가까우면 척력
 *  3. 감쇠     : 속도 × DAMPING (에너지 손실)
 */

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { physicsStore } from '@/store/physicsStore'
import {
  getDriftingCenter,
  computePairForce,
  HOME_SPRING,
  DAMPING,
  MAX_SPEED,
} from '@/utils/physics'

// 물리 업데이트 주기 (2프레임마다 1회 → 30fps 물리)
const PHYSICS_STRIDE = 2

export function usePhysics() {
  const frameRef = useRef(0)

  useFrame((state, delta) => {
    frameRef.current++
    if (frameRef.current % PHYSICS_STRIDE !== 0) return

    // 누적 델타를 감안한 실질 dt (최대 0.05 cap → 탭 비활성 후 복귀 시 폭발 방지)
    const dt = Math.min(delta * PHYSICS_STRIDE, 0.05)
    const time = state.clock.elapsedTime

    const entries = physicsStore.getAll()
    const n = entries.length
    if (n === 0) return

    // ── 임시 힘 누적 배열 ──────────────────────────────────────────
    // Float32Array로 GC 압박 최소화
    const forces = new Float32Array(n * 3) // [fx0,fy0,fz0, fx1,...]

    for (let i = 0; i < n; i++) {
      const a = entries[i]
      const i3 = i * 3

      // 1. 홈 스프링 (드리프팅 성단 중심으로 복원)
      const [hx, hy, hz] = getDriftingCenter(a.language, time)
      forces[i3]     += (hx - a.position.x) * HOME_SPRING
      forces[i3 + 1] += (hy - a.position.y) * HOME_SPRING
      forces[i3 + 2] += (hz - a.position.z) * HOME_SPRING

      // 2. N-body 쌍힘 (대칭 이용 → j>i 만 계산, 반작용 동시 적용)
      for (let j = i + 1; j < n; j++) {
        const b = entries[j]
        const j3 = j * 3

        const [fx, fy, fz] = computePairForce(
          a.position.x, a.position.y, a.position.z, a.language,
          b.position.x, b.position.y, b.position.z, b.language,
        )

        forces[i3]     += fx
        forces[i3 + 1] += fy
        forces[i3 + 2] += fz
        // 뉴턴 3법칙: b에는 반대 방향
        forces[j3]     -= fx
        forces[j3 + 1] -= fy
        forces[j3 + 2] -= fz
      }
    }

    // ── 속도·위치 갱신 + 메시 적용 ─────────────────────────────────
    for (let i = 0; i < n; i++) {
      const e = entries[i]
      const i3 = i * 3

      // 속도 갱신 + 감쇠
      e.velocity.x = (e.velocity.x + forces[i3]     * dt) * DAMPING
      e.velocity.y = (e.velocity.y + forces[i3 + 1] * dt) * DAMPING
      e.velocity.z = (e.velocity.z + forces[i3 + 2] * dt) * DAMPING

      // 최대 속력 제한
      const spd = e.velocity.length()
      if (spd > MAX_SPEED) e.velocity.multiplyScalar(MAX_SPEED / spd)

      // 위치 갱신
      e.position.x += e.velocity.x * dt
      e.position.y += e.velocity.y * dt
      e.position.z += e.velocity.z * dt

      // Three.js Object3D(Group)에 직접 적용 (React 리렌더 없음)
      if (e.object) {
        e.object.position.copy(e.position)
      }
    }
  })
}

// ── Lerp 유틸 (Star.tsx에서도 사용) ─────────────────────────────
export { lerp } from '@/utils/physics'
export { lerpStep } from '@/hooks/3d/useLerp'
