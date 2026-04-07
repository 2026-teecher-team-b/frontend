/**
 * 3D 캔버스 컴포넌트 Props 타입
 *
 * Star가 Zustand store에서 점수를 직접 구독하므로
 * StarProps에는 위치/식별 정보만 포함한다.
 * 점수(activityScore, healthScore)는 useGalaxyStore(s => s.scores[repoId])로 읽는다.
 */

/** 3D Star(별) 컴포넌트가 받는 Props */
export interface StarProps {
  repoId: number
  name: string
  position: [number, number, number]
  language: string | null
  onClick?: (repoId: number) => void
}

/** 성단(Cluster) 그룹 Props — 5~6주차 Cluster.tsx 구현 시 사용 */
export interface ClusterProps {
  language: string
  center: [number, number, number]
  stars: StarProps[]
}
