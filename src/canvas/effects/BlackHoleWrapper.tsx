/**
 * BlackHoleWrapper.tsx — 블랙홀 스파이럴을 physicsStore 위치에 배치
 *
 * InstancedStarField 에서 개별 Star 컴포넌트가 없어졌으므로
 * 블랙홀 레포에 한해 이 래퍼를 사용해 physicsStore 위치를 group에 연결한다.
 */
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { physicsStore } from '@/store/physicsStore'
import BlackHoleSpiral from './BlackHoleSpiral'

interface Props {
  repoId: number
}

export default function BlackHoleWrapper({ repoId }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  // physicsStore에 group 연결 (setObject)
  useEffect(() => {
    if (!groupRef.current) return
    physicsStore.setObject(repoId, groupRef.current)
    // 주의: InstancedStarField도 같은 repoId로 setObject를 호출하면 덮어씀
    // → Star 컴포넌트가 없으므로 이 래퍼가 유일한 object 등록자
  }, [repoId])

  // 매 프레임 physicsStore 위치를 group에 반영 (setObject 덮어쓰기 보완)
  useFrame(() => {
    const entry = physicsStore.entries.get(repoId)
    if (entry && groupRef.current) {
      groupRef.current.position.copy(entry.position)
    }
  })

  return (
    <group ref={groupRef}>
      <BlackHoleSpiral visible />
    </group>
  )
}
