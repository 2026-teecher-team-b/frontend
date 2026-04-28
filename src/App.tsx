import { useEffect } from 'react'
import Scene from '@/canvas/Scene'
//import FrameMonitor from '@/canvas/effects/FrameMonitor'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useMockWebSocket } from '@/api/mockWebSocket'
import { connectWebSocket, disconnectWebSocket } from '@/api/websocket'
import { DUMMY_REPOSITORIES, DUMMY_SCORES } from '@/data/dummy'
import Tooltip from './components/overlay/Tooltip'


/**
 * App.tsx — 최상위 레이아웃
 *
 * [현재 1~4주차]
 *  - 더미 데이터 로드 후 3D 씬 렌더링
 *  - DEV: useMockWebSocket()으로 실시간 점수 변화 시뮬레이션
 *  - PROD: connectWebSocket()으로 실제 BE WebSocket 연결
 *
 * [TODO 3~4주차 BE 완성 후]
 *  - setRepositories → GET /api/repos API 호출로 교체
 *  - DUMMY_SCORES 제거 → 초기 점수는 API에서 수신
 */
export default function App() {
  const { setRepositories, updateScore } = useGalaxyStore()

  // ── 초기 데이터 로드 ───────────────────────────────────────────
  useEffect(() => {
    setRepositories(DUMMY_REPOSITORIES)
    DUMMY_SCORES.forEach((score) => updateScore(score.repoId, score))
  }, [setRepositories, updateScore])

  // ── WebSocket 연결 ─────────────────────────────────────────────
  // DEV: 목 WebSocket (BE 없이 실시간 시뮬레이션)
  // PROD: 실제 WebSocket (아래 useEffect)
  useMockWebSocket()

  useEffect(() => {
    if (import.meta.env.DEV) return  // 개발 중엔 Mock 사용

    connectWebSocket()
    return () => disconnectWebSocket()
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* ── 3D 캔버스 (전체 화면) ── */}
      <Scene />

      {/* ── 2D UI 오버레이 (유민님이 해주시면 됩니다. 구현 예정 구역) ── */}
      {/* <Panel /> */}
      <Tooltip />

      {/* 임시 상태 표시 (개발 중 확인용) */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-mono pointer-events-none">
        GitHub Universe — 개발 중
      </div>

      {/* FPS 모니터 (DEV only) */}
      {/* <FrameMonitor /> */}
    </div>
  )
}
