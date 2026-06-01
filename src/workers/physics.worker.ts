/**
 * physics.worker.ts — 나선 은하 물리 시뮬레이션 Web Worker  v4
 *
 * v4 변경: 웜홀 깔때기 → 나선 은하 디스크
 *  - 별들이 언어별 나선팔에 배치
 *  - activityScore → 반지름 (활성 = 내부, 비활성 = 외부)
 *  - Kepler 궤도 속도 (내부 = 빠름, 외부 = 느림)
 *  - 블랙홀: 반지름이 코어로 lerp (나선팔 따라 안으로 빨려들어감)
 *
 * 프로토콜 (메인 → Worker):
 *   { type: 'register',     repoId, activityScore, armAngle }
 *   { type: 'unregister',   repoId }
 *   { type: 'updateScores', scores: Record<number, { activityScore, healthScore }> }
 *   { type: 'tick',         dt: number, time: number }
 *
 * 프로토콜 (Worker → 메인):
 *   { type: 'positions',    data: Float32Array }  — [repoId, x, y, z, ...] zero-copy
 */

/// <reference lib="webworker" />

// ── 물리 상수 (physics.ts 와 동일) ──────────────────────────────────
const BLACKHOLE_HEALTH_THRESHOLD = 2
const GALAXY_R_INNER   = 22
const GALAXY_R_OUTER   = 185
const GALAXY_H_AMP     = 14
const SPIRAL_K         = 0.55
const BASE_ORBIT_SPEED = 0.038
const GALAXY_R_LERP    = 0.012
const BH_R_PULL        = 0.007
const BH_THETA_MULT    = 4.2

function activityToGalaxyRadius(activity: number): number {
  const t = Math.max(0, Math.min(100, activity)) / 100
  return GALAXY_R_OUTER - (GALAXY_R_OUTER - GALAXY_R_INNER) * t
}

function spiralTheta(armAngle: number, r: number, orbitAngle: number): number {
  return armAngle + SPIRAL_K * Math.log(Math.max(1, r / GALAXY_R_INNER) + 1) + orbitAngle
}

function seeded(id: number, salt: number): number {
  return Math.abs(Math.sin(id * 127.1 + salt * 311.7) * 43758.5453) % 1
}

// ── Worker 내부 물리 상태 ────────────────────────────────────────────
interface WorkerEntry {
  repoId:     number
  orbitAngle: number   // 현재 궤도 각도 (지속 증가)
  thetaSpeed: number   // 속도 배율 (0.7 ~ 1.3)
  currentR:   number   // 현재 반지름 (목표 R로 lerp 중)
  noisePhase: number   // 디스크 높이 노이즈 위상
  armAngle:   number   // 나선팔 기준 각도 (고정)
}

interface ScoreData {
  activityScore: number
  healthScore:   number
}

const entries = new Map<number, WorkerEntry>()
let scores: Record<number, ScoreData> = {}

// ── 메시지 핸들러 ────────────────────────────────────────────────────
self.onmessage = (event: MessageEvent) => {
  const msg = event.data as Record<string, unknown>

  switch (msg.type) {

    case 'register': {
      const repoId       = msg.repoId       as number
      const activityScore = msg.activityScore as number ?? 50
      const armAngle     = msg.armAngle     as number ?? 0
      if (entries.has(repoId)) return

      const initR = activityToGalaxyRadius(activityScore)
      entries.set(repoId, {
        repoId,
        orbitAngle: seeded(repoId, 1) * Math.PI * 2,
        thetaSpeed: 0.7 + seeded(repoId, 2) * 0.6,   // 0.7 ~ 1.3
        currentR:   initR,
        noisePhase: seeded(repoId, 3) * Math.PI * 2,
        armAngle,
      })
      break
    }

    case 'unregister': {
      entries.delete(msg.repoId as number)
      break
    }

    case 'updateScores': {
      scores = msg.scores as Record<number, ScoreData>
      break
    }

    case 'tick': {
      const dt   = msg.dt   as number
      const time = msg.time as number

      const buf = new Float32Array(entries.size * 4)
      let i = 0

      for (const e of entries.values()) {
        const score       = scores[e.repoId]
        const activity    = score?.activityScore ?? 50
        const isBlackHole = (score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD

        // ── 1. 반지름 업데이트 ────────────────────────────────────
        const targetR = activityToGalaxyRadius(activity)
        const rLerpSpeed = isBlackHole ? GALAXY_R_LERP * 3.5 : GALAXY_R_LERP
        e.currentR += (targetR - e.currentR) * Math.min(rLerpSpeed * 60 * dt, 1)

        // 블랙홀: 코어로 추가 당김 (나선팔 따라 안으로 빨려 들어감)
        if (isBlackHole) {
          e.currentR += (GALAXY_R_INNER * 0.4 - e.currentR) * BH_R_PULL
        }

        const r = Math.max(GALAXY_R_INNER * 0.3, e.currentR)

        // ── 2. 궤도 각도 업데이트 (Kepler 속도) ──────────────────
        // 내부 = 빠름 (실제 은하처럼)
        const keplerFactor = Math.sqrt(GALAXY_R_INNER / r)
        const bhMult = isBlackHole ? BH_THETA_MULT : 1.0
        e.orbitAngle += e.thetaSpeed * BASE_ORBIT_SPEED * keplerFactor * bhMult * dt

        // ── 3. 3D 위치 계산 ───────────────────────────────────────
        const theta = spiralTheta(e.armAngle, r, e.orbitAngle)

        // 디스크 두께: 내부일수록 두꺼움 (rNorm: 내부=1, 외부=0)
        const rNorm = 1 - (r - GALAXY_R_INNER) / (GALAXY_R_OUTER - GALAXY_R_INNER)
        const y = GALAXY_H_AMP * Math.sin(time * 0.35 + e.noisePhase) * Math.max(0, rNorm)

        buf[i++] = e.repoId
        buf[i++] = r * Math.cos(theta)
        buf[i++] = y
        buf[i++] = r * Math.sin(theta)
      }

      // zero-copy transfer
      self.postMessage({ type: 'positions', data: buf }, [buf.buffer])
      break
    }
  }
}
