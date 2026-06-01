/**
 * usePhysics.ts — 나선 은하 물리 시뮬레이션 (Web Worker 기반)  v4
 *
 * v4 변경: 웜홀 깔때기 → 나선 은하 디스크
 *  - Worker에 armAngle 전달
 *  - 메인 스레드 폴백도 은하 물리로 교체
 */

import { useEffect, useRef } from 'react'
import { useFrame }          from '@react-three/fiber'
import { physicsStore }      from '@/store/physicsStore'
import { useGalaxyStore }    from '@/store/useGalaxyStore'

import {
  activityToGalaxyRadius,
  spiralTheta,
  GALAXY_R_INNER,
  GALAXY_H_AMP,
  BASE_ORBIT_SPEED,
  GALAXY_R_LERP,
  BH_R_PULL,
  BH_THETA_MULT,
  BLACKHOLE_HEALTH_THRESHOLD,
} from '@/utils/physics'

// ── 메인 스레드 폴백 (Worker 불가 환경) ──────────────────────────────
function runPhysicsSync(dt: number, time: number) {
  const scores  = useGalaxyStore.getState().scores
  const entries = physicsStore.getAll()

  for (const e of entries) {
    const score       = scores[e.repoId]
    const activity    = score?.activityScore ?? 50
    const isBlackHole = (score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD

    // 반지름 lerp
    const targetR = activityToGalaxyRadius(activity)
    const rLerp   = isBlackHole ? GALAXY_R_LERP * 3.5 : GALAXY_R_LERP
    e.currentR += (targetR - e.currentR) * Math.min(rLerp * 60 * dt, 1)
    if (isBlackHole) e.currentR += (GALAXY_R_INNER * 0.4 - e.currentR) * BH_R_PULL

    const r = Math.max(GALAXY_R_INNER * 0.3, e.currentR)

    // 궤도 각도 (Kepler)
    const keplerFactor = Math.sqrt(GALAXY_R_INNER / r)
    const bhMult = isBlackHole ? BH_THETA_MULT : 1.0
    e.orbitAngle += e.thetaSpeed * BASE_ORBIT_SPEED * keplerFactor * bhMult * dt

    // 3D 위치
    const theta = spiralTheta(e.armAngle, r, e.orbitAngle)
    const rNorm = 1 - (r - GALAXY_R_INNER) / (185 - GALAXY_R_INNER)
    const y = GALAXY_H_AMP * Math.sin(time * 0.35 + e.noisePhase) * Math.max(0, rNorm)

    e.position.set(r * Math.cos(theta), y, r * Math.sin(theta))
    if (e.object) e.object.position.copy(e.position)
  }
}

// ─────────────────────────────────────────────────────────────────────
export function usePhysics() {
  const workerRef  = useRef<Worker | null>(null)
  const pendingRef = useRef(false)
  const scoresRef  = useRef<object | null>(null)

  useEffect(() => {
    if (typeof Worker === 'undefined') return

    const worker = new Worker(
      new URL('@/workers/physics.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

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

    worker.onerror = (err) => { console.error('[GalaxyWorker]', err.message) }

    // 기존 entries 초기 등록
    const initialScores = useGalaxyStore.getState().scores
    physicsStore.entries.forEach((entry) => {
      worker.postMessage({
        type:          'register',
        repoId:        entry.repoId,
        activityScore: initialScores[entry.repoId]?.activityScore ?? 50,
        armAngle:      entry.armAngle,
      })
    })

    // register / unregister 콜백 — armAngle 포함
    physicsStore.onRegister = (entry) => {
      const s = useGalaxyStore.getState().scores
      worker.postMessage({
        type:          'register',
        repoId:        entry.repoId,
        activityScore: s[entry.repoId]?.activityScore ?? 50,
        armAngle:      entry.armAngle,
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

  useFrame((state, delta) => {
    const dt   = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const worker = workerRef.current

    if (!worker) { runPhysicsSync(dt, time); return }

    const scores = useGalaxyStore.getState().scores
    if (scores !== scoresRef.current) {
      scoresRef.current = scores
      worker.postMessage({ type: 'updateScores', scores })
    }

    if (pendingRef.current) return
    pendingRef.current = true
    worker.postMessage({ type: 'tick', dt, time })
  })
}

export { lerp }     from '@/utils/physics'
export { lerpStep } from '@/hooks/3d/useLerp'
