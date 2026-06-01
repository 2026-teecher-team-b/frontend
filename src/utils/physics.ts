/**
 * physics.ts — 물리/수학 유틸리티  v4 (Galaxy Disc)
 *
 * v4 변경: 웜홀 깔때기 → 나선 은하 디스크
 *  - 별들이 언어별 나선팔(arm)에 배치됨
 *  - activityScore → 은하 중심으로부터의 반지름 (활성 = 내부, 비활성 = 외부)
 *  - healthScore < 2 → 블랙홀: 나선팔을 따라 중심으로 빨려 들어감
 *  - 2D 뷰(위에서): 언어별 나선팔이 명확히 구분됨
 *
 * 오픈소스 기여자 관점:
 *  - 내부 링 = 가장 활발한 레포 (기여 수용 빠름)
 *  - 나선팔 색 = 기술 스택 (언어)
 *  - 별 크기  = 레포 인기도 (star/fork 수)
 *  - 중심부   = 핵심 생태계 (매우 활발한 레포들)
 */

import type { Vector3 } from 'three'

// ─────────────────────────────────────────────────────────────────
// 1. 선형 보간
// ─────────────────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec3(
  current: Vector3,
  target: Vector3,
  t: number,
): { x: number; y: number; z: number } {
  return {
    x: lerp(current.x, target.x, t),
    y: lerp(current.y, target.y, t),
    z: lerp(current.z, target.z, t),
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. 점수 → 시각 속성
// ─────────────────────────────────────────────────────────────────

export function scoreToRadius(sizeScore: number, activityScore = 50): number {
  const s = Math.max(0, Math.min(100, sizeScore))
  const a = Math.max(0, Math.min(100, activityScore))
  // 기본 크기: sizeScore 기반 (0.18 ~ 1.50)
  const base    = 0.18 + Math.sqrt(s / 100) * 1.32
  // 활성도 배율: 활발할수록 약간 더 크게 (0.75 ~ 1.30)
  const actMult = 0.75 + (a / 100) * 0.55
  return base * actMult
}

export function scoreToEmissiveIntensity(healthScore: number): number {
  const h = Math.max(0, Math.min(100, healthScore))
  return 0.15 + (Math.log1p(h / 100 * Math.E) / Math.log1p(Math.E)) * 1.8
}

// ─────────────────────────────────────────────────────────────────
// 3. 언어별 색상
// ─────────────────────────────────────────────────────────────────

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#60aaff',
  JavaScript:  '#ffe033',
  Python:      '#5dcbf5',
  Go:          '#00f0d8',
  Rust:        '#ff7055',
  Java:        '#ffbf55',
  'C++':       '#ff5c8a',
  Ruby:        '#ff5555',
  Swift:       '#ff7a40',
  Kotlin:      '#cc88ff',
  PHP:         '#aaaaff',
  'C#':        '#80e080',
  Scala:       '#ff6666',
  Haskell:     '#bb88ff',
}
export const DEFAULT_COLOR = '#ccd8ee'

export function getLanguageColor(language: string | null): string {
  return language ? (LANGUAGE_COLORS[language] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

// ─────────────────────────────────────────────────────────────────
// 4. 나선 은하 디스크 (Galaxy Disc)  ★ v4 핵심
// ─────────────────────────────────────────────────────────────────
//
//  은하 좌표계:
//   - 중심 (0,0,0) = 갤럭틱 코어
//   - Y = 0 평면 = 은하 디스크 (±GALAXY_H_AMP 높이)
//
//  반지름 공식:
//   r = GALAXY_R_OUTER - (GALAXY_R_OUTER - GALAXY_R_INNER) * activity/100
//   → activity 100 = GALAXY_R_INNER (코어 근처, 가장 활발)
//   → activity 0   = GALAXY_R_OUTER (외곽, 비활성)
//
//  나선팔 공식:
//   θ = armBaseAngle + SPIRAL_K * ln(r / GALAXY_R_INNER + 1) + orbitAngle
//   → 같은 언어 = 같은 arm 방향
//   → r이 클수록 armAngle에서 더 많이 구부러짐 → 진짜 나선 모양
//

/** 블랙홀 판정 임계값 */
export const BLACKHOLE_HEALTH_THRESHOLD = 2

/** 은하 내부 반지름 (가장 활발한 레포 위치) */
export const GALAXY_R_INNER = 22

/** 은하 외부 반지름 (비활성 / 외곽 팔) */
export const GALAXY_R_OUTER = 185

/** 디스크 두께 진폭 (y축 노이즈) — 내부일수록 더 두꺼움 */
export const GALAXY_H_AMP = 14

/** 나선팔 감김 계수 (클수록 팔이 더 타이트하게 감김) */
export const SPIRAL_K = 0.55

/** 궤도 기본 속도 (rad/s) — 반지름별 Kepler 보정 적용 */
export const BASE_ORBIT_SPEED = 0.038

/** 반지름 lerp 속도 */
export const GALAXY_R_LERP = 0.012

/** 블랙홀 중심 당김 속도 */
export const BH_R_PULL = 0.007

/** 블랙홀 회전 배율 */
export const BH_THETA_MULT = 4.2

/** 언어별 나선팔 시작 각도 (radians) */
const DEG = Math.PI / 180
export const LANG_ARM_ANGLES: Record<string, number> = {
  TypeScript:  0   * DEG,
  JavaScript:  26  * DEG,
  Python:      52  * DEG,
  Go:          78  * DEG,
  Rust:        104 * DEG,
  Java:        130 * DEG,
  'C++':       156 * DEG,
  Ruby:        182 * DEG,
  Swift:       208 * DEG,
  Kotlin:      234 * DEG,
  PHP:         260 * DEG,
  'C#':        286 * DEG,
  Scala:       312 * DEG,
  Haskell:     338 * DEG,
}

/** 결정론적 시드 (repoId 기반) */
function seeded(id: number, salt: number): number {
  return Math.abs(Math.sin(id * 127.1 + salt * 311.7) * 43758.5453) % 1
}

/**
 * activityScore(0~100) → 은하 반지름.
 * 활성도 높을수록 코어 근처(작은 r), 낮을수록 외곽(큰 r).
 */
export function activityToGalaxyRadius(activityScore: number): number {
  const t = Math.max(0, Math.min(100, activityScore)) / 100
  return GALAXY_R_OUTER - (GALAXY_R_OUTER - GALAXY_R_INNER) * t
}

/**
 * 언어 → 나선팔 기준 각도.
 * 미등록 언어는 repoId 기반 결정론적 값 사용.
 */
export function getArmAngle(language: string | null, repoId: number): number {
  if (language && LANG_ARM_ANGLES[language] !== undefined) {
    return LANG_ARM_ANGLES[language]
  }
  return seeded(repoId, 42) * Math.PI * 2
}

/**
 * 나선팔 theta 계산.
 * θ = baseArm + SPIRAL_K * ln(r / R_INNER + 1) + orbitAngle
 */
export function spiralTheta(armAngle: number, r: number, orbitAngle: number): number {
  return armAngle + SPIRAL_K * Math.log(Math.max(1, r / GALAXY_R_INNER) + 1) + orbitAngle
}

/**
 * (activityScore, armAngle, orbitAngle, time, noisePhase) → 3D 좌표 [x,y,z]
 */
export function galaxyPosition(
  activityScore: number,
  armAngle: number,
  orbitAngle: number,
  time: number,
  noisePhase: number,
): [number, number, number] {
  const r = activityToGalaxyRadius(activityScore)
  const theta = spiralTheta(armAngle, r, orbitAngle)
  // 내부일수록 디스크 두꺼움 (rNorm: 1=내부, 0=외부)
  const rNorm = 1 - (r - GALAXY_R_INNER) / (GALAXY_R_OUTER - GALAXY_R_INNER)
  const y = GALAXY_H_AMP * Math.sin(time * 0.35 + noisePhase) * Math.max(0, rNorm)
  return [r * Math.cos(theta), y, r * Math.sin(theta)]
}

/**
 * 초기 별 위치 생성 (physicsStore.register 용)
 */
export function generateGalaxyPosition(
  language: string | null,
  repoId: number,
  activityScore = 50,
): [number, number, number] {
  const armAngle  = getArmAngle(language, repoId)
  const orbitAngle = seeded(repoId, 1) * Math.PI * 2
  return galaxyPosition(activityScore, armAngle, orbitAngle, 0, seeded(repoId, 3) * Math.PI * 2)
}

// ─────────────────────────────────────────────────────────────────
// 5. 레거시 (웜홀 / N-body) — 하위 호환용, 현재는 미사용
// ─────────────────────────────────────────────────────────────────

export const RIM_Y      =  120
export const THROAT_Y   = -160
export const RIM_R      =  195
export const THROAT_R   =    4
export const EXPONENT   =  0.52
export const FUNNEL_LERP_SPEED = 0.028
export const BASE_THETA_SPEED  = 0.06
export const SURFACE_NOISE_AMP = 6.0

export function activityToY(activityScore: number): number {
  const t = Math.max(0, Math.min(100, activityScore)) / 100
  return THROAT_Y + (RIM_Y - THROAT_Y) * t
}

export function funnelRadius(y: number): number {
  const t = Math.max(0, Math.min(1, (y - THROAT_Y) / (RIM_Y - THROAT_Y)))
  return THROAT_R + (RIM_R - THROAT_R) * Math.pow(t, EXPONENT)
}

export function funnelPosition(
  activityScore: number,
  theta: number,
  noiseOffset = 0,
): [number, number, number] {
  const y = activityToY(activityScore) + noiseOffset
  const r = funnelRadius(y)
  return [r * Math.cos(theta), y, r * Math.sin(theta)]
}

export const ATTRACTION_K   = 0.040
export const REPULSION_K    = 3.8
export const HOME_SPRING    = 0.005
export const DAMPING        = 0.91
export const MAX_SPEED      = 1.2
export const MIN_DIST       = 4.5
export const ATTRACTION_RANGE = 75
export const REPULSION_RANGE  = 30

const CLUSTER_BASES: Record<string, [number, number, number]> = {
  TypeScript: [ 85,  40,  8], JavaScript: [ 55, -42,  0],
  Python:     [-90,  25,  5], Go:         [ 12,  92, -5],
  Rust:       [ 10, -92,  5], Java:       [-62,  58, -4],
  'C++':      [-48, -62,  6], Ruby:       [-88, -38,  0],
  Swift:      [ 58,  72,  2], Kotlin:     [-28,  68, 10],
  PHP:        [-72, -12,  5], 'C#':       [ 42, -72, -5],
  Scala:      [-18, -58, 10], Haskell:    [ 30,  62, -8],
}

export function generateClusteredPosition(language: string | null): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  const spread = 28
  return [
    base[0] + (Math.random() - 0.5) * spread,
    base[1] + (Math.random() - 0.5) * spread,
    base[2] + (Math.random() - 0.5) * spread * 0.5,
  ]
}

export function getDriftingCenter(language: string | null, time: number): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  const phase = language ? language.charCodeAt(0) * 1.618 : 0
  const amp = 6
  return [
    base[0] + Math.sin(time * 0.11 + phase) * amp,
    base[1] + Math.cos(time * 0.08 + phase * 1.3) * (amp * 0.8),
    base[2] + Math.sin(time * 0.06 + phase * 0.7) * (amp * 0.4),
  ]
}

export function getBaseCenter(language: string | null): [number, number, number] {
  return language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
}

export function computePairForce(
  ax: number, ay: number, az: number, langA: string | null,
  bx: number, by: number, bz: number, langB: string | null,
): [number, number, number] {
  const dx = bx - ax, dy = by - ay, dz = bz - az
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist < 0.001) return [0, 0, 0]
  const clampedDist = Math.max(dist, MIN_DIST)
  const nx = dx / dist, ny = dy / dist, nz = dz / dist
  const sameLang = langA !== null && langA === langB
  let fx = 0, fy = 0, fz = 0
  if (sameLang && dist < ATTRACTION_RANGE) {
    const f = ATTRACTION_K / (clampedDist * clampedDist)
    fx += nx * f; fy += ny * f; fz += nz * f
  }
  if (dist < REPULSION_RANGE) {
    const f = REPULSION_K / (clampedDist * clampedDist)
    fx -= nx * f; fy -= ny * f; fz -= nz * f
  }
  return [fx, fy, fz]
}
