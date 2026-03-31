import { useRef } from 'react'
import { lerp } from '@/utils/physics'

/**
 * 값이 target으로 부드럽게 이동하도록 보간하는 훅
 * useFrame 내에서 delta와 함께 사용
 *
 * @example
 * const lerpedValue = useLerp(0)
 * useFrame((_, delta) => {
 *   lerpedValue.current = lerp(lerpedValue.current, target, delta * 5)
 * })
 */
export function useLerpRef(initial: number) {
  return useRef<number>(initial)
}

/**
 * 3D 위치 보간 — 5~6주차 별 이동 구현 시 사용
 */
export function lerpStep(current: number, target: number, delta: number, speed = 3): number {
  return lerp(current, target, delta * speed)
}
