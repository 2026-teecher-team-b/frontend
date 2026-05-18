/**
 * usePhysics.ts — 깔때기 물리 시뮬레이션 (Web Worker 기반)  v4
 *
 * v4 변경: 물리 루프를 Web Worker로 분리
 *  - 메인 스레드: 렌더링만 담당 (scripting 부담 감소)
 *  - Worker:     매 tick 마다 위치 계산 → Float32Array(zero-copy) 전송
 *
 * Worker 동기화 전략:
 *  1. 마운트 시: physicsStore 기존 entries 전부 Worker에 등록
 *  2. register/unregister: physicsStore 콜백으로 Worker 실시간 동기화
 *  3. scores:   Zustand 참조가 바뀔 때만 postMessage (매 프레임 직렬화 ✕)
 *  4. tick:     매 프레임 { dt, time } 만 전송 (경량)
 *  5. Worker → 메인: ArrayBuffer transfer (zero-copy), physicsStore에 적용
 *
 * Worker 불가 환경 폴백:
 *  - typeof Worker === 'undefined' → 메인 스레드에서 동기 실행 (구형 환경 대비)
 */

import { useEffect, useRef } from 'react'
import { useFrame }          from '@react-three/fiber'
import { physicsStore }      from '@/store/physicsStore'
import { useGalaxyStore }    from '@/store/useGalaxyStore'

// ── 메인 스레드 폴백 (Worker 불가 환경) ─────────────────────────────
// Worker가 있으면 이 경로는 실행되지 않는다.
import {
  activityToY,
  funnelRadius,
  FUNNEL_LERP_SPEED,
  BASE_THETA_SPEED,
  BH_THETA_MULT,
  SURFACE_NOISE_AMP,
  BLACKHOLE_HEALTH_THRESHOLD,
} from '@/utils/physics'

function runPhysicsSync(dt: number, time: number) {
  const scores  = useGalaxyStore.getState().scores
  const entries = physicsStore.getAll()
  for (const e of entries) {
    const score       = scores[e.repoId]
    const activity    = score?.activityScore ?? 50
    const isBlackHole = (score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD
    const targetY     = activityToY(activity)
    const lerpSpeed   = isBlackHole ? FUNNEL_LERP_SPEED * 3.5 : FUNNEL_LERP_SPEED
    e.currentY += (targetY - e.currentY) * Math.min(lerpSpeed * 60 * dt, 1)
    const thetaMult = isBlackHole ? BH_THETA_MULT : 1.0
    e.theta += e.thetaSpeed * BASE_THETA_SPEED * thetaMult * dt
    const noise = Math.sin(time * 0.6 + e.noisePhase) * SURFACE_NOISE_AMP
    const y = e.currentY + noise
    const r = funnelRadius(y)
    e.position.set(r * Math.cos(e.theta), y, r * Math.sin(e.theta))
    if (e.object) e.object.position.copy(e.position)
  }
}

// ─────────────────────────────────────────────────────────────────────
export function usePhysics() {
  const workerRef   = useRef<Worker | null>(null)
  const pendingRef  = useRef(false)          // Worker 응답 대기 중 여부
  const scoresRef   = useRef<object | null>(null)  // 마지막으로 전송한 scores 참조

  // ── Worker 초기화 ─────────────────────────────────────────────
  useEffect(() => {
    // Web Worker 미지원 환경 (SSR, 구형 브라우저) — 폴백으로 진행
    if (typeof Worker === 'undefined') return

    const worker = new Worker(
      new URL('@/workers/physics.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    // Worker → 메인: 위치 배열 수신
    worker.onmessage = (event: MessageEvent) => {
      pendingRef.current = false
      if (event.data.type !== 'positions') return

      const data = event.data.data as Float32Array
      for (let i = 0; i < data.length; i += 4) {
        const repoId = data[i]
        const entry  = physicsStore.entries.get(repoId)
        if (!entry) continue
        entry.position.set(data[i + 1], data[i + 2], data[i + 3])
        if (entry.object) entry.object.position.copy(entry.position)
      }
    }

    worker.onerror = (err) => {
      console.error('[PhysicsWorker]', err.message, err)
    }

    // ── 기존 physicsStore entries 초기 등록 ───────────────────────
    const initialScores = useGalaxyStore.getState().scores
    physicsStore.entries.forEach((entry) => {
      worker.postMessage({
        type:          'register',
        repoId:        entry.repoId,
        activityScore: initialScores[entry.repoId]?.activityScore ?? 50,
      })
    })

    // ── register / unregister 콜백 주입 ───────────────────────────
    // physicsStore.register() 호출 시 Worker에 즉시 알림
    physicsStore.onRegister = (entry) => {
      const s = useGalaxyStore.getState().scores
      worker.postMessage({
        type:          'register',
        repoId:        entry.repoId,
        activityScore: s[entry.repoId]?.activityScore ?? 50,
      })
    }
    physicsStore.onUnregister = (repoId) => {
      worker.postMessage({ type: 'unregister', repoId })
    }

    return () => {
      physicsStore.onRegister   = null
      physicsStore.onUnregister = null
      worker.terminate()
      workerRef.current  = null
      pendingRef.current = false
    }
  }, [])

  // ── 매 프레임 tick 전송 ───────────────────────────────────────
  useFrame((state, delta) => {
    const dt   = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime

    const worker = workerRef.current

    // ── Worker 없음 → 메인 스레드 폴백 ───────────────────────────
    if (!worker) {
      runPhysicsSync(dt, time)
      return
    }

    // scores 참조가 바뀐 경우에만 직렬화·전송 (매 프레임 아님)
    const scores = useGalaxyStore.getState().scores
    if (scores !== scoresRef.current) {
      scoresRef.current = scores
      worker.postMessage({ type: 'updateScores', scores })
    }

    // 이전 tick 응답을 아직 받지 못한 경우 스킵 (큐 과부하 방지)
    if (pendingRef.current) return
    pendingRef.current = true
    worker.postMessage({ type: 'tick', dt, time })
  })
}

// ── 하위 호환 export ─────────────────────────────────────────────
export { lerp }     from '@/utils/physics'
export { lerpStep } from '@/hooks/3d/useLerp'
