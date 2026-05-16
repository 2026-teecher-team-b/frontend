/**
 * physics.ts — 물리/수학 유틸리티
 *
 * 포함:
 *  1. Lerp 함수 (스칼라 / Vector3)
 *  2. 점수 → 시각 속성 변환
 *  3. 언어별 색상 맵
 *  4. 깔때기(Wormhole) 수학 — v3 전면 개편
 *     - activityToY  : 활성도 점수 → Y축 위치
 *     - funnelRadius : Y좌표 → 해당 Y에서의 깔때기 반지름
 *     - funnelPosition : (점수, theta) → 3D 위치 [x,y,z]
 *  5. N-body 상수 (레거시 — 현재는 미사용)
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

/**
 * 별 시각 반지름 계산
 *
 * 정규화 후 sizeScore/activityScore가 3~95 범위로 들어옴.
 * 제곱근 스케일 적용 → 중간 크기 별이 많아져 은하가 풍성해 보임.
 *
 * 최종 범위: 약 0.22 ~ 2.55
 */
export function scoreToRadius(sizeScore: number, activityScore = 50): number {
  const s = Math.max(0, Math.min(100, sizeScore))
  const a = Math.max(0, Math.min(100, activityScore))
  const base    = 0.28 + Math.sqrt(s / 100) * 1.85   // 제곱근: 하위권도 어느 정도 크기 보장
  const actMult = 0.80 + (a / 100) * 0.45             // 활동 기반 ±25% 조정
  return base * actMult
}

/**
 * healthScore(0~100) → emissive 강도 (0.15 ~ 1.95)
 * 로그 스케일: 낮은 점수도 완전히 꺼지지 않고 희미하게 빛남.
 * 정규화 후 최솟값이 3 이상이므로 블랙홀이 아닌 별은 항상 보임.
 */
export function scoreToEmissiveIntensity(healthScore: number): number {
  const h = Math.max(0, Math.min(100, healthScore))
  return 0.15 + (Math.log1p(h / 100 * Math.E) / Math.log1p(Math.E)) * 1.8
}

// ─────────────────────────────────────────────────────────────────
// 3. 언어별 색상
// ─────────────────────────────────────────────────────────────────

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#4f8ef7',
  JavaScript:  '#f7d44f',
  Python:      '#4da8e0',
  Go:          '#00d4c8',
  Rust:        '#f07050',
  Java:        '#e8a24a',
  'C++':       '#e05080',
  Ruby:        '#d94040',
  Swift:       '#f05c30',
  Kotlin:      '#b06cff',
  PHP:         '#9090e0',
  'C#':        '#68c060',
  Scala:       '#d04040',
  Haskell:     '#9060c8',
}
export const DEFAULT_COLOR = '#aabbcc'

export function getLanguageColor(language: string | null): string {
  return language ? (LANGUAGE_COLORS[language] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

// ─────────────────────────────────────────────────────────────────
// 4. 깔때기(Wormhole) 수학  ★ v3 핵심
// ─────────────────────────────────────────────────────────────────
//
//  Y축 = 높이
//   RIM_Y  = 상단 넓은 입구 (활성도 높은 별들)
//   THROAT_Y = 하단 좁은 목 (활성도 낮은 별, 블랙홀)
//
//  반지름 공식:
//   r(y) = THROAT_R + (RIM_R - THROAT_R) * ((y - THROAT_Y) / (RIM_Y - THROAT_Y))^EXPONENT
//
//  EXPONENT < 1  → 목이 좁고 입구 쪽이 급격히 넓어지는 깔때기 모양.
//

/**
 * 블랙홀 판정 healthScore 임계값
 * calcHealthScore: hourlyAvg × 20 → 0.1 events/hr = 2점
 * 즉 하루 약 2.4건 미만 활동 레포만 블랙홀로 표시
 */
export const BLACKHOLE_HEALTH_THRESHOLD = 2

/** 깔때기 상단 Y 좌표 (활성도 100인 별 위치) */
export const RIM_Y     =  120
/** 깔때기 목 Y 좌표 (활성도 0인 별, 블랙홀) */
export const THROAT_Y  = -160
/** 상단 입구 반지름 */
export const RIM_R     =  195
/** 하단 목 반지름 */
export const THROAT_R  =    4
/** 반지름 곡선 지수 (< 1 → 깔때기 형상) */
export const EXPONENT  =  0.52
/** Y축 lerp 속도 (클수록 빠르게 목표 Y로 이동) */
export const FUNNEL_LERP_SPEED = 0.028
/** 수평 회전 기본 속도 (rad/s) */
export const BASE_THETA_SPEED  = 0.22
/** 블랙홀 회전 배율 */
export const BH_THETA_MULT     = 4.5
/** 표면 위아래 약간의 노이즈 진폭 */
export const SURFACE_NOISE_AMP = 6.0

/**
 * activityScore(0~100) → 깔때기 Y 좌표.
 * 활성도 높을수록 위, 낮을수록 아래(목).
 */
export function activityToY(activityScore: number): number {
  const t = Math.max(0, Math.min(100, activityScore)) / 100
  return THROAT_Y + (RIM_Y - THROAT_Y) * t
}

/**
 * Y좌표 → 해당 높이에서의 깔때기 반지름.
 * y가 THROAT_Y 이하면 THROAT_R, RIM_Y 이상이면 RIM_R.
 */
export function funnelRadius(y: number): number {
  const t = Math.max(0, Math.min(1, (y - THROAT_Y) / (RIM_Y - THROAT_Y)))
  return THROAT_R + (RIM_R - THROAT_R) * Math.pow(t, EXPONENT)
}

/**
 * (activityScore, theta) → 깔때기 표면 위의 3D 좌표 [x, y, z].
 * noiseOffset: 표면에서 약간 위아래 노이즈 (0이면 정확한 표면)
 */
export function funnelPosition(
  activityScore: number,
  theta: number,
  noiseOffset = 0,
): [number, number, number] {
  const y = activityToY(activityScore) + noiseOffset
  const r = funnelRadius(y)
  return [r * Math.cos(theta), y, r * Math.sin(theta)]
}

// ─────────────────────────────────────────────────────────────────
// 5. 레거시 N-body 상수 (하위 호환 — 현재 사용 안 함)
// ─────────────────────────────────────────────────────────────────

export const ATTRACTION_K   = 0.040
export const REPULSION_K    = 3.8
export const HOME_SPRING    = 0.005
export const DAMPING        = 0.91
export const MAX_SPEED      = 1.2
export const MIN_DIST       = 4.5
export const ATTRACTION_RANGE = 75
export const REPULSION_RANGE  = 30

const CLUSTER_BASES: Record<string, [number, number, number]> = {
  TypeScript:  [ 85,  40,  8],
  JavaScript:  [ 55, -42,  0],
  Python:      [-90,  25,  5],
  Go:          [ 12,  92, -5],
  Rust:        [ 10, -92,  5],
  Java:        [-62,  58, -4],
  'C++':       [-48, -62,  6],
  Ruby:        [-88, -38,  0],
  Swift:       [ 58,  72,  2],
  Kotlin:      [-28,  68, 10],
  PHP:         [-72, -12,  5],
  'C#':        [ 42, -72, -5],
  Scala:       [-18, -58, 10],
  Haskell:     [ 30,  62, -8],
}

export function getDriftingCenter(
  language: string | null,
  time: number,
): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  // 언어 첫 글자 코드로 위상 결정 → 언어마다 다른 궤도
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

export function generateClusteredPosition(
  language: string | null,
): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  const spread = 28
  return [
    base[0] + (Math.random() - 0.5) * spread,
    base[1] + (Math.random() - 0.5) * spread,
    base[2] + (Math.random() - 0.5) * spread * 0.5,
  ]
}

export function computePairForce(
  ax: number, ay: number, az: number, langA: string | null,
  bx: number, by: number, bz: number, langB: string | null,
): [number, number, number] {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist < 0.001) return [0, 0, 0]

  const clampedDist = Math.max(dist, MIN_DIST)
  const nx = dx / dist  // 정규화 방향
  const ny = dy / dist
  const nz = dz / dist

  const sameLang = langA !== null && langA === langB

  let fx = 0, fy = 0, fz = 0

  if (sameLang && dist < ATTRACTION_RANGE) {
    const f = ATTRACTION_K / (clampedDist * clampedDist)
    fx += nx * f
    fy += ny * f
    fz += nz * f
  }

  if (dist < REPULSION_RANGE) {
    const f = REPULSION_K / (clampedDist * clampedDist)
    fx -= nx * f
    fy -= ny * f
    fz -= nz * f
  }

  return [fx, fy, fz]
}
