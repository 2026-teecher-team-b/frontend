/**
 * physics.ts — 물리/수학 유틸리티
 *
 * 포함:
 *  1. Lerp 함수 (스칼라 / Vector3)
 *  2. 점수 → 시각 속성 변환
 *  3. 언어별 성단 중심 좌표 + 드리프트 (느린 공전)
 *  4. N-body 물리 상수 및 힘 계산 헬퍼
 *  5. 별 초기 위치 생성 (클러스터 기반)
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

/** activityScore(0~100) → 별 반지름(0.3~3.0) */
export function scoreToRadius(score: number): number {
  return 0.3 + (Math.max(0, Math.min(100, score)) / 100) * 2.7
}

/** healthScore(0~100) → emissive 강도(0.1~2.5) */
export function scoreToEmissiveIntensity(healthScore: number): number {
  return 0.1 + (Math.max(0, Math.min(100, healthScore)) / 100) * 2.4
}

// ─────────────────────────────────────────────────────────────────
// 3. 언어별 성단 기준 좌표 & 드리프트
// ─────────────────────────────────────────────────────────────────
//
// 실제 성단 이미지에서 영감:
//   TypeScript  → 플레이아데스(Pleiades)  : 파란 산개성단, 중밀도
//   JavaScript  → 이중성단(Double)         : 두 무리, 따뜻한 노랑
//   Python      → 오메가 센타우리(Omega Cen): 초고밀도 구상성단
//   Go          → 나비 성단(Butterfly)     : 나비 모양 두 날개
//   Rust        → 소원의 우물(Wishing Well) : 붉은·주황 색감
//   Java        → 프레세페(Praesepe)       : 중밀도 노란 산개
//   C++         → 머리털자리(Coma)         : 분산, 핑크
//   Ruby        → 히아데스(Hyades)         : 가장 가까운 V자 배열
//   Swift       → 페르세우스(Perseus Alpha) : 아름다운 파랑+주황

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

/**
 * 시간에 따라 천천히 움직이는 성단 중심 좌표.
 * 각 언어마다 위상(phase)이 달라 서로 다른 리듬으로 움직인다.
 */
export function getDriftingCenter(
  language: string | null,
  time: number,
): [number, number, number] {
  const base = language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
  // 언어 첫 글자 코드로 위상 결정 → 언어마다 다른 궤도
  const phase = language ? language.charCodeAt(0) * 1.618 : 0
  const amp = 14  // 진폭 (단위 거리)

  return [
    base[0] + Math.sin(time * 0.11 + phase) * amp,
    base[1] + Math.cos(time * 0.08 + phase * 1.3) * (amp * 0.8),
    base[2] + Math.sin(time * 0.06 + phase * 0.7) * (amp * 0.4),
  ]
}

/** 성단 중심 좌표 (드리프트 없는 고정값, Cluster 컴포넌트 초기화용) */
export function getBaseCenter(language: string | null): [number, number, number] {
  return language ? (CLUSTER_BASES[language] ?? [0, 0, 0]) : [0, 0, 0]
}

// ─────────────────────────────────────────────────────────────────
// 4. N-body 물리 상수
// ─────────────────────────────────────────────────────────────────

/** 같은 언어 별끼리 끌어당기는 강도 */
export const ATTRACTION_K = 0.018
/** 다른 언어 별에게 밀려나는 강도 */
export const REPULSION_K = 2.8
/** 성단 중심으로 끌리는 스프링 상수 */
export const HOME_SPRING = 0.022
/** 속도 감쇠 (1프레임당) */
export const DAMPING = 0.94
/** 최대 속력 (units/s) */
export const MAX_SPEED = 0.45
/** 최소 거리 (0 나누기 방지) */
export const MIN_DIST = 5.0
/** 동일 언어 인력 유효 범위 */
export const ATTRACTION_RANGE = 55
/** 타 언어 척력 유효 범위 */
export const REPULSION_RANGE = 28

// ─────────────────────────────────────────────────────────────────
// 5. 초기 클러스터 배치 위치 생성
// ─────────────────────────────────────────────────────────────────

/**
 * 언어 기반 클러스터 중심 + 랜덤 오프셋으로 초기 위치 생성.
 * 물리 시뮬레이션 시작 전 초기값으로만 쓰인다.
 */
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

// ─────────────────────────────────────────────────────────────────
// 6. N-body 힘 계산 (usePhysics에서 호출)
// ─────────────────────────────────────────────────────────────────

/**
 * 두 별 사이의 힘을 계산하여 entryA의 가속도(fx, fy, fz)에 누적한다.
 *
 * @returns [fx, fy, fz] 증분값
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
  const nx = dx / dist  // 정규화 방향
  const ny = dy / dist
  const nz = dz / dist

  const sameLang = langA !== null && langA === langB

  let fx = 0, fy = 0, fz = 0

  // 같은 언어: 인력 (서로 끌어당김)
  if (sameLang && dist < ATTRACTION_RANGE) {
    const f = ATTRACTION_K / (clampedDist * clampedDist)
    fx += nx * f
    fy += ny * f
    fz += nz * f
  }

  // 가까울 때: 모든 별끼리 척력 (겹침 방지)
  if (dist < REPULSION_RANGE) {
    const f = REPULSION_K / (clampedDist * clampedDist)
    fx -= nx * f
    fy -= ny * f
    fz -= nz * f
  }

  return [fx, fy, fz]
}
