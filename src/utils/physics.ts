import type { Vector3 } from 'three'

/**
 * 선형 보간 (Lerp)
 * 5~6주차 실시간 별 이동에 사용
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Vector3 선형 보간
 */
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

/**
 * 중력/척력 알고리즘 (5~6주차 구현 예정)
 * 언어별 성단(Cluster)을 자연스럽게 형성하기 위한 힘 계산
 * 같은 언어 = 인력, 다른 언어 = 척력
 */
export function calculateGravityForce(
  _posA: Vector3,
  _posB: Vector3,
  _sameCluster: boolean,
): { x: number; y: number; z: number } {
  // TODO: 5~6주차 구현
  return { x: 0, y: 0, z: 0 }
}

/**
 * 활동 점수(0~100)를 별 반지름으로 변환
 */
export function scoreToRadius(score: number): number {
  const MIN_RADIUS = 0.3
  const MAX_RADIUS = 2.5
  return MIN_RADIUS + (score / 100) * (MAX_RADIUS - MIN_RADIUS)
}

/**
 * 건강 점수(0~100)를 emissive 강도로 변환
 */
export function scoreToEmissiveIntensity(healthScore: number): number {
  return 0.2 + (healthScore / 100) * 1.8
}
