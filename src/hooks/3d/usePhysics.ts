/**
 * usePhysics.ts — 깔때기(Wormhole) 물리 시뮬레이션  v3
 *
 * N-body(O(n²)) → 깔때기 구속 이동(O(n)) 으로 전환.
 * 1000개 별도 60fps에서 쾌적하게 동작한다.
 *
 * 매 프레임 각 별에 대해:
 *  1. Zustand에서 최신 activityScore 읽기
 *  2. activityToY(score) → 목표 Y 계산
 *  3. currentY를 목표 Y 방향으로 lerp (FUNNEL_LERP_SPEED)
 *  4. theta += thetaSpeed * dt  (블랙홀은 BH_THETA_MULT 배 빠름)
 *  5. 표면 노이즈: sin(time + phase) * SURFACE_NOISE_AMP
 *  6. funnelPosition(score, theta, noise) → 새 [x,y,z]
 *  7. e.position.set(x, y, z) → e.object.position.copy()
 */

import { useFrame } from '@react-three/fiber'
import { physicsStore } from '@/store/physicsStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import {
  activityToY,
  funnelRadius,
  FUNNEL_LERP_SPEED,
  BASE_THETA_SPEED,
  BH_THETA_MULT,
  SURFACE_NOISE_AMP,
} from '@/utils/physics'

export function usePhysics() {
  useFrame((state, delta) => {
    // delta cap: 탭 비활성 후 복귀 시 폭발 방지
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime

    const scores  = useGalaxyStore.getState().scores
    const entries = physicsStore.getAll()

    for (const e of entries) {
      // ── 1. 최신 점수 읽기 ─────────────────────────────────────
      const score       = scores[e.repoId]
      const activity    = score?.activityScore ?? 50
      const isBlackHole = (score?.healthScore ?? 50) < 10

      // ── 2. 목표 Y ─────────────────────────────────────────────
      const targetY = activityToY(activity)

      // ── 3. Y lerp ─────────────────────────────────────────────
      //   블랙홀은 빠르게 목으로 빨려들어감
      const lerpSpeed = isBlackHole
        ? FUNNEL_LERP_SPEED * 3.5
        : FUNNEL_LERP_SPEED
      e.currentY += (targetY - e.currentY) * Math.min(lerpSpeed * 60 * dt, 1)

      // ── 4. 수평 회전 ──────────────────────────────────────────
      const thetaMult = isBlackHole ? BH_THETA_MULT : 1.0
      e.theta += e.thetaSpeed * BASE_THETA_SPEED * thetaMult * dt

      // ── 5. 표면 노이즈 (부드러운 오르내림) ───────────────────
      const noise = Math.sin(time * 0.6 + e.noisePhase) * SURFACE_NOISE_AMP

      // ── 6. 새 위치 계산 ───────────────────────────────────────
      const y = e.currentY + noise
      const r = funnelRadius(y)
      const x = r * Math.cos(e.theta)
      const z = r * Math.sin(e.theta)

      e.position.set(x, y, z)

      // ── 7. Three.js Object3D에 직접 적용 ─────────────────────
      if (e.object) {
        e.object.position.copy(e.position)
      }
    }
  })
}

// ── 하위 호환 export ─────────────────────────────────────────────
export { lerp } from '@/utils/physics'
export { lerpStep } from '@/hooks/3d/useLerp'
