/**
 * physicsStore.ts — 모듈 레벨 물리 싱글톤 (v3 — Wormhole)
 *
 * React 상태가 아니므로 업데이트 시 리렌더 없이
 * Three.js Object3D position을 직접 변경한다. (최고 성능)
 *
 * v3 변경 사항:
 *  - PhysicsEntry에 theta, thetaSpeed, currentY 추가
 *    → 깔때기 표면 위에서 수평 회전 + Y 높이 lerp 관리
 *  - register()에서 초기 theta를 repoId 기반 결정론적 값으로 세팅
 *    → 새로고침 시 항상 동일한 초기 배치
 */

import * as THREE from 'three'
import { funnelPosition, activityToY } from '@/utils/physics'

export interface PhysicsEntry {
  repoId: number
  language: string | null

  /** 현재 3D 위치 (Three.js Vector3 — 직접 변경됨) */
  position: THREE.Vector3

  /** 깔때기 수평 회전각 (라디안) */
  theta: number

  /** 수평 회전 속도 (rad/s) — 블랙홀은 더 빠름 */
  thetaSpeed: number

  /** 현재 Y 좌표 (목표 Y로 lerp 중인 값) */
  currentY: number

  /** 표면 노이즈 위상 (repoId 기반 고정) */
  noisePhase: number

  /**
   * 연결된 Three.js Object3D(Group 또는 Mesh).
   * Star.tsx에서 <group> ref를 등록한다.
   */
  object: THREE.Object3D | null

  // 레거시 (N-body) — 미사용이지만 타입 호환 유지
  velocity: THREE.Vector3
}

/** 결정론적 pseudo-random: sin 해시 */
function seeded(id: number, salt: number): number {
  return Math.abs(Math.sin(id * 127.1 + salt * 311.7) * 43758.5453) % 1
}

class PhysicsStore {
  entries = new Map<number, PhysicsEntry>()

  /**
   * Star 마운트 시 호출 — 초기 위치와 언어로 엔트리 생성.
   * activityScore는 초기 Y 위치 계산에 사용.
   */
  register(
    repoId: number,
    _position: [number, number, number], // 레거시 파라미터 — 깔때기 위치로 대체
    language: string | null,
    activityScore = 50,
  ): void {
    if (this.entries.has(repoId)) return

    // 결정론적 초기 각도 (0 ~ 2π)
    const theta0     = seeded(repoId, 1) * Math.PI * 2
    // 회전 속도: 0.12 ~ 0.35 rad/s
    const thetaSpeed = 0.12 + seeded(repoId, 2) * 0.23
    // 초기 Y = 목표 Y (즉시 배치)
    const initY      = activityToY(activityScore)
    // 표면 노이즈 위상
    const noisePhase = seeded(repoId, 3) * Math.PI * 2

    const [ix, iy, iz] = funnelPosition(activityScore, theta0)

    this.entries.set(repoId, {
      repoId,
      language,
      position:   new THREE.Vector3(ix, iy, iz),
      theta:      theta0,
      thetaSpeed,
      currentY:   initY,
      noisePhase,
      object:     null,
      velocity:   new THREE.Vector3(0, 0, 0), // 레거시
    })
  }

  /** group/mesh ref가 준비된 후 호출 */
  setObject(repoId: number, object: THREE.Object3D): void {
    const e = this.entries.get(repoId)
    if (e) e.object = object
  }

  /** Star 언마운트 시 정리 */
  unregister(repoId: number): void {
    this.entries.delete(repoId)
  }

  /** 전체 엔트리 배열 (물리 루프용) */
  getAll(): PhysicsEntry[] {
    return Array.from(this.entries.values())
  }
}

/** 앱 전체에서 공유하는 싱글톤 인스턴스 */
export const physicsStore = new PhysicsStore()
