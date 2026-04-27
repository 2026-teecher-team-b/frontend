/**
 * physics.ts — 물리/수학 유틸리티
 *
 * 포함:
 *  1. Lerp 함수 (스칼라 / Vector3)
 *  2. 점수 → 시각 속성 변환
 *  3. 언어별 성단 기준 좌표 & 드리프트(참고용, Cluster는 실제 centroid 사용)
 *  4. N-body 물리 상수 및 힘 계산 헬퍼
 *  5. 별 초기 위치 생성 (클러스터 기반)
 *
 * v2 물리 튜닝:
 *  - HOME_SPRING 0.022 → 0.005 : 홈 복원력 대폭 약화 → 별이 자유롭게 유영
 *  - DAMPING 0.94 → 0.91       : 감쇠 감소 → 더 생동감 있는 움직임
 *  - MAX_SPEED 0.45 → 1.2      : 최대 속력 증가
 *  - ATTRACTION_K 0.018 → 0.040: 동일 언어 인력 강화 → 또렷한 클러스터 형성
 *  - REPULSION_K 2.8 → 3.8     : 겹침 방지 강화
 *  - ATTRACTION_RANGE 55 → 75  : 인력 유효 범위 확장
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

/** activityScore(0~100) → 별 반지름(0.4~3.5) */
export function scoreToRadius(score: number): number {
  return 0.4 + (Math.max(0, Math.min(100, score)) / 100) * 3.1
}

/** healthScore(0~100) → emissive 강도(0.1~2.8) */
export function scoreToEmissiveIntensity(healthScore: number): number {
  return 0.1 + (Math.max(0, Math.min(100, healthScore)) / 100) * 2.7
}

// ─────────────────────────────────────────────────────────────────
// 3. 언어별 성단 기준 좌표 & 드리프트
// ─────────────────────────────────────────────────────────────────
//
// 주요 성단 배치:
//   TypeScript  → 플레이아데스(Pleiades)      : 파란 산개성단, 중밀도
//   JavaScript  → 이중성단(Double Cluster)    : 두 무리, 따뜻한 노랑
//   Python      → 오메가 센타우리(Omega Cen)   : 초고밀도 구상성단
//   Go          → 나비 성단(Butterfly)        : 나비 모양 두 날개
//   Rust        → 소원의 우물(Wishing Well)   : 붉은·주황 색감
//   Java        → 프레세페(Praesepe)          : 중밀도 노란 산개

export const CLUSTER_BASES: Record<string, [number, number, number]> = {
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

/**
 * 시간에 따라 천천히 움직이는 성단 중심 좌표.
 * Cluster.tsx의 초기화/fallback에서만 사용.
 * 실제 운용은 physicsStore centroid를 따름.
 */
export function getDriftingCenter(
  language: string | null,
  time: number,
): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  const phase = language ? language.charCodeAt(0) * 1.618 : 0
  const amp = 6  // 진폭 축소 (실제 별 움직임과 혼동 방지)

  return [
    base[0] + Math.sin(time * 0.09 + phase) * amp,
    base[1] + Math.cos(time * 0.07 + phase * 1.3) * (amp * 0.8),
    base[2] + Math.sin(time * 0.05 + phase * 0.7) * (amp * 0.4),
  ]
}

/** 성단 기준 좌표 (드리프트 없는 고정값) */
export function getBaseCenter(language: string | null): [number, number, number] {
  return language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
}

// ─────────────────────────────────────────────────────────────────
// 4. N-body 물리 상수 (v2 — 더 역동적인 움직임)
// ─────────────────────────────────────────────────────────────────

/** 같은 언어 별끼리 끌어당기는 강도 */
export const ATTRACTION_K = 0.040
/** 모든 별 사이 척력 강도 (겹침 방지) */
export const REPULSION_K = 3.8
/** 성단 기준점으로 끌리는 스프링 상수 (약하게 → 별이 자유롭게 유영) */
export const HOME_SPRING = 0.005
/** 속도 감쇠 (값이 낮을수록 더 오래 움직임) */
export const DAMPING = 0.91
/** 최대 속력 (units/frame, 실제 units/s ÷ 60fps 내외) */
export const MAX_SPEED = 1.2
/** 최소 거리 (0 나누기 방지) */
export const MIN_DIST = 4.5
/** 동일 언어 인력 유효 범위 */
export const ATTRACTION_RANGE = 75
/** 척력 유효 범위 */
export const REPULSION_RANGE = 30

// ─────────────────────────────────────────────────────────────────
// 5. 초기 클러스터 배치 위치 생성
// ─────────────────────────────────────────────────────────────────

/**
 * 언어 기반 클러스터 중심 + 랜덤 오프셋으로 초기 위치 생성.
 * spread 확대(→38) → 초기 분산이 커서 물리가 더 역동적으로 시작됨.
 */
export function generateClusteredPosition(
  language: string | null,
): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  const spread = 38
  return [
    base[0] + (Math.random() - 0.5) * spread,
    base[1] + (Math.random() - 0.5) * spread,
    base[2] + (Math.random() - 0.5) * spread * 0.6,
  ]
}

// ─────────────────────────────────────────────────────────────────
// 6. N-body 힘 계산 (usePhysics에서 호출)
// ─────────────────────────────────────────────────────────────────

/**
 * 두 별 사이의 힘을 계산. entryA에 적용할 [fx, fy, fz]를 반환.
 * 뉴턴 3법칙으로 entryB에는 반대 방향 힘이 적용된다.
 */
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
  const nx = dx / dist
  const ny = dy / dist
  const nz = dz / dist

  const sameLang = langA !== null && langA === langB

  let fx = 0, fy = 0, fz = 0

  // 같은 언어: 인력 (클러스터 형성)
  if (sameLang && dist < ATTRACTION_RANGE) {
    const f = ATTRACTION_K / (clampedDist * clampedDist)
    fx += nx * f
    fy += ny * f
    fz += nz * f
  }

  // 근접 시: 척력 (겹침/밀집 방지)
  if (dist < REPULSION_RANGE) {
    const f = REPULSION_K / (clampedDist * clampedDist)
    fx -= nx * f
    fy -= ny * f
    fz -= nz * f
  }

  return [fx, fy, fz]
}
