/**
 * physics.worker.ts — 깔때기 물리 시뮬레이션 Web Worker
 *
 * 메인 스레드에서 분리해 렌더링 전용 메인 스레드의 scripting 부담 감소.
 *
 * 프로토콜 (메인 → Worker):
 *   { type: 'register',      repoId, activityScore }
 *   { type: 'unregister',    repoId }
 *   { type: 'updateScores',  scores: Record<number, { activityScore, healthScore }> }
 *   { type: 'tick',          dt: number, time: number }
 *
 * 프로토콜 (Worker → 메인):
 *   { type: 'positions',     data: Float32Array }  — [repoId, x, y, z, ...] 반복
 *   ArrayBuffer transfer로 복사 없이 메인 스레드로 이전 (zero-copy)
 *
 * 설계 원칙:
 *  - Three.js 의존 없음 (순수 math만 사용)
 *  - 물리 상태(theta, currentY 등)를 Worker 내부에서 완전히 관리
 *  - postMessage 직렬화 비용 최소화:
 *      · scores는 변경 시에만 전송 (매 프레임 아님)
 *      · tick 메시지는 dt + time만 전송 (경량)
 *      · 결과는 ArrayBuffer transfer (zero-copy)
 */

/// <reference lib="webworker" />

// ── 물리 상수 (physics.ts 와 동일하게 유지) ─────────────────────────
// Worker는 Three.js를 import할 수 없으므로 상수를 직접 정의.
const BLACKHOLE_HEALTH_THRESHOLD = 2
const THROAT_Y   = -160
const RIM_Y      =  120
const THROAT_R   =    4
const RIM_R      =  195
const EXPONENT   =  0.52
const FUNNEL_LERP_SPEED = 0.028
const BASE_THETA_SPEED  = 0.22
const BH_THETA_MULT     = 4.5
const SURFACE_NOISE_AMP = 6.0

function activityToY(activityScore: number): number {
  const t = Math.max(0, Math.min(100, activityScore)) / 100
  return THROAT_Y + (RIM_Y - THROAT_Y) * t
}

function funnelRadius(y: number): number {
  const t = Math.max(0, Math.min(1, (y - THROAT_Y) / (RIM_Y - THROAT_Y)))
  return THROAT_R + (RIM_R - THROAT_R) * Math.pow(t, EXPONENT)
}

/** physicsStore.ts 와 동일한 결정론적 시드 함수 */
function seeded(id: number, salt: number): number {
  return Math.abs(Math.sin(id * 127.1 + salt * 311.7) * 43758.5453) % 1
}

// ── Worker 내부 물리 상태 ────────────────────────────────────────────
interface WorkerEntry {
  repoId:     number
  theta:      number
  thetaSpeed: number
  currentY:   number
  noisePhase: number
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

    // 새 별 등록
    case 'register': {
      const repoId       = msg.repoId       as number
      const activityScore = msg.activityScore as number ?? 50
      if (entries.has(repoId)) return
      entries.set(repoId, {
        repoId,
        theta:      seeded(repoId, 1) * Math.PI * 2,
        thetaSpeed: 0.12 + seeded(repoId, 2) * 0.23,
        currentY:   activityToY(activityScore),
        noisePhase: seeded(repoId, 3) * Math.PI * 2,
      })
      break
    }

    // 별 제거
    case 'unregister': {
      entries.delete(msg.repoId as number)
      break
    }

    // 점수 업데이트 (변경 시에만 전송되므로 매 프레임 호출 아님)
    case 'updateScores': {
      scores = msg.scores as Record<number, ScoreData>
      break
    }

    // 물리 시뮬레이션 1 tick
    case 'tick': {
      const dt   = msg.dt   as number
      const time = msg.time as number

      // Float32Array: [repoId, x, y, z] × entries.size
      // Transferable로 zero-copy 전송 (ArrayBuffer 소유권 이전)
      const buf = new Float32Array(entries.size * 4)
      let i = 0

      for (const e of entries.values()) {
        const score      = scores[e.repoId]
        const activity   = score?.activityScore ?? 50
        const isBlackHole = (score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD

        // Y 위치 lerp (블랙홀은 3.5× 속도로 목으로 빨려 들어감)
        const targetY   = activityToY(activity)
        const lerpSpeed = isBlackHole ? FUNNEL_LERP_SPEED * 3.5 : FUNNEL_LERP_SPEED
        e.currentY += (targetY - e.currentY) * Math.min(lerpSpeed * 60 * dt, 1)

        // 수평 회전
        const thetaMult = isBlackHole ? BH_THETA_MULT : 1.0
        e.theta += e.thetaSpeed * BASE_THETA_SPEED * thetaMult * dt

        // 표면 노이즈 (부드러운 오르내림)
        const noise = Math.sin(time * 0.6 + e.noisePhase) * SURFACE_NOISE_AMP
        const y     = e.currentY + noise
        const r     = funnelRadius(y)

        buf[i++] = e.repoId
        buf[i++] = r * Math.cos(e.theta)
        buf[i++] = y
        buf[i++] = r * Math.sin(e.theta)
      }

      // ArrayBuffer transfer — 복사 없이 메인 스레드로 이전
      self.postMessage({ type: 'positions', data: buf }, [buf.buffer])
      break
    }
  }
}
