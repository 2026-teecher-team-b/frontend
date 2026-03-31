import type { Vector3 } from 'three'

/** 3D Star(별) 오브젝트가 받는 Props */
export interface StarProps {
  repoId: number
  name: string
  position: Vector3 | [number, number, number]
  /** 0 ~ 100 값 → Three.js에서 반지름으로 매핑 */
  activityScore: number
  /** 0 ~ 100 값 → 발광 강도로 매핑 */
  healthScore: number
  language: string | null
  /** 블랙홀 판정 여부 */
  isBlackHole?: boolean
  onClick?: (repoId: number) => void
}

/** 성단(Cluster) 그룹 Props */
export interface ClusterProps {
  language: string
  /** 클러스터 중심 좌표 */
  center: [number, number, number]
  stars: StarProps[]
}
