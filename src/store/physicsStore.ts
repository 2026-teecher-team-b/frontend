/**
 * physicsStore.ts — 모듈 레벨 물리 싱글톤
 *
 * React 상태가 아니므로 업데이트 시 리렌더 없이
 * Three.js Object3D position을 직접 변경한다. (최고 성능)
 *
 * 흐름:
 *  Star.tsx  → mount 시 register() 호출
 *  Star.tsx  → group ref 연결 후 setObject() 호출
 *  usePhysics → useFrame에서 step()으로 위치/속도 갱신 후 object.position 직접 set
 *
 * v2 변경: mesh → object (THREE.Object3D) 로 타입 완화
 *          → Star 컴포넌트가 <group>으로 바뀌면서 Group ref를 등록할 수 있게 됨
 */

import * as THREE from 'three'

export interface PhysicsEntry {
  repoId: number
  language: string | null
  /** 현재 위치 (Three.js Vector3 — 직접 변경됨) */
  position: THREE.Vector3
  /** 현재 속도 */
  velocity: THREE.Vector3
  /**
   * 연결된 Three.js Object3D(Group 또는 Mesh) — 위치가 여기에 직접 적용됨.
   * Star.tsx에서 <group> ref를 등록한다.
   */
  object: THREE.Object3D | null
}

class PhysicsStore {
  entries = new Map<number, PhysicsEntry>()

  /** Star 마운트 시 호출 — 초기 위치와 언어로 엔트리 생성 */
  register(
    repoId: number,
    position: [number, number, number],
    language: string | null,
  ): void {
    if (this.entries.has(repoId)) return // 중복 방지
    this.entries.set(repoId, {
      repoId,
      language,
      position: new THREE.Vector3(...position),
      // 초기 속도: 더 큰 랜덤 값 → 별들이 처음부터 활발하게 움직임
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.15,
      ),
      object: null,
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
