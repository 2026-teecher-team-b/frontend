import { useEffect } from 'react'
import Scene from '@/canvas/Scene'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { DUMMY_REPOSITORIES, DUMMY_SCORES } from '@/data/dummy'

/**
 * App.tsx — 최상위 레이아웃
 *
 * [현재] 더미 데이터로 3D 씬 렌더링
 * [3~4주차] WebSocket 연결 및 실제 API 연동으로 교체 예정
 */
export default function App() {
  const { setRepositories, updateScore } = useGalaxyStore()

  // 더미 데이터 초기 로드 (추후 API 호출로 교체)
  useEffect(() => {
    setRepositories(DUMMY_REPOSITORIES)
    DUMMY_SCORES.forEach((score) => updateScore(score.repoId, score))
  }, [setRepositories, updateScore])

  return (
    <div className="relative w-full h-full">
      {/* ── 3D 캔버스 (전체 화면) ── */}
      <Scene />

      {/* ── 2D UI 오버레이 (팀원 구현 예정 구역) ── */}
      {/* <SidePanel /> */}
      {/* <Tooltip /> */}
      {/* <Header /> */}

      {/* 임시 상태 표시 (개발 중 확인용) */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-mono pointer-events-none">
        GitHub Universe — 개발 중
      </div>
    </div>
  )
}
