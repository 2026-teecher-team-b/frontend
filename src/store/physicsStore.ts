/**
 * physicsStore.ts — 모듈 레벨 물리 싱글톤  v4 (Galaxy Disc)
 *
 * v4 변경:
 *  - theta → orbitAngle (궤도 각도)
 *  - currentY → currentR (반지름)
 *  - armAngle 추가 (나선팔 고정 각도)
 */

import * as THREE from 'three'
import {
  activityToGalaxyRadius,
  generateGalaxyPosition,
  getArmAngle,
} from '@/utils/physics'

export interface PhysicsEntry {
  repoId: number
  language: string | null

  /** 현재 3D 위치 (Three.js Vector3 — 직접 변경됨) */
  position: THREE.Vector3

  /** 궤도 각도 (rad, 지속 증가) */
  orbitAngle: number

  /** 속도 배율 (0.7 ~ 1.3) — 별마다 약간 다름 */
  thetaSpeed: number

  /** 현재 반지름 (목표 R로 lerp 중) */
  currentR: number

  /** 디스크 높이 노이즈 위상 */
  noisePhase: number

  /** 나선팔 기준 각도 (고정, 언어 기반) */
  armAngle: number

  /** Three.js Object3D 연결 ref */
  object: THREE.Object3D | null

  /** 레거시 (미사용) */
  velocity: THREE.Vector3

  // ── 하위 호환 getter (usePhysics 폴백용) ──
  get theta(): number   // → orbitAngle
  get currentY(): number // → 0 (flat disc)
}

function seeded(id: number, salt: number): number {
  return Math.abs(Math.sin(id * 127.1 + salt * 311.7) * 43758.5453) % 1
}

class PhysicsStore {
  entries = new Map<number, PhysicsEntry>()

  onRegister:   ((entry: PhysicsEntry) => void) | null = null
  onUnregister: ((repoId: number)      => void) | null = null

  register(
    repoId: number,
    _position: [number, number, number],
    language: string | null,
    activityScore = 50,
  ): void {
    if (this.entries.has(repoId)) return

    const armAngle   = getArmAngle(language, repoId)
    const initR      = activityToGalaxyRadius(activityScore)
    const orbitAngle = seeded(repoId, 1) * Math.PI * 2
    const thetaSpeed = 0.7 + seeded(repoId, 2) * 0.6
    const noisePhase = seeded(repoId, 3) * Math.PI * 2

    const [ix, iy, iz] = generateGalaxyPosition(language, repoId, activityScore)

    // Mutable entry — use defineProperties for legacy getters
    const entry = {
      repoId,
      language,
      position:   new THREE.Vector3(ix, iy, iz),
      orbitAngle,
      thetaSpeed,
      currentR:   initR,
      noisePhase,
      armAngle,
      object:     null,
      velocity:   new THREE.Vector3(0, 0, 0),
      get theta()    { return this.orbitAngle },
      get currentY() { return 0 },
    } as PhysicsEntry

    this.entries.set(repoId, entry)
    this.onRegister?.(entry)
  }

  setObject(repoId: number, object: THREE.Object3D): void {
    const e = this.entries.get(repoId)
    if (e) e.object = object
  }

  unregister(repoId: number): void {
    this.entries.delete(repoId)
    this.onUnregister?.(repoId)
  }

  getAll(): PhysicsEntry[] {
    return Array.from(this.entries.values())
  }
}

export const physicsStore = new PhysicsStore()

