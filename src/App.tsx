import { useEffect } from 'react'
import Scene from '@/canvas/Scene'
import FrameMonitor from '@/canvas/effects/FrameMonitor'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useMockWebSocket } from '@/api/mockWebSocket'
import { connectWebSocket, disconnectWebSocket } from '@/api/websocket'
import { DUMMY_REPOSITORIES, DUMMY_SCORES } from '@/data/dummy'
// ── 2D UI 컴포넌트 ──────────────────────────────────────────────────
import SidePanel from '@/components/panel/SidePanel'
import Tooltip from '@/components/overlay/Tooltip'
import Legend from '@/components/overlay/Legend'
import HelpOverlay from '@/components/overlay/HelpOverlay'
import LoginButton from '@/components/overlay/LoginButton'
import SearchBar from '@/components/overlay/SearchBar'
import { useUIStore } from '@/store/useUIStore'

/**
 * App.tsx — 최상위 레이아웃
 *
 * [1~4주차]
 *  - 더미 데이터 로드 후 3D 씬 렌더링
 *  - DEV: useMockWebSocket()으로 실시간 점수 변화 시뮬레이션
 *  - PROD: connectWebSocket()으로 실제 BE WebSocket 연결
 *
 * [3~6주차]
 *  - Tooltip: 별 hover 시 미리보기
 *  - SidePanel: 별 클릭 시 상세 정보 + 점수 차트
 *  - Legend: 언어 색상 범례
 *  - HelpOverlay: 카메라 조작 가이드
 *
 * [7~8주차]
 *  - SidePanel 내 RAG 분석 ("왜?" 버튼)
 *  - 블랙홀 스파이럴 이펙트 (Star.tsx에서 자동 활성화)
 *
 * [9~10주차]
 *  - LoginButton: GitHub OAuth
 *  - My Galaxy 필터 (SidePanel 즐겨찾기 토글)
 *
 * [TODO BE 준비 후]
 *  - setRepositories → GET /api/repos API 호출로 교체
 *  - DUMMY_SCORES 제거 → 초기 점수는 API에서 수신
 */
export default function App() {
  const { setRepositories, updateScore, isConnected } = useGalaxyStore()
  const isPanelOpen = useUIStore((s) => s.isPanelOpen)

  // ── 초기 데이터 로드 ───────────────────────────────────────────
  // DEV: 더미 데이터로 초기화 (BE API 준비 전)
  // PROD: 실제 API 호출로 교체 예정
  useEffect(() => {
    setRepositories(DUMMY_REPOSITORIES)
    DUMMY_SCORES.forEach((score) => updateScore(score.repoId, score))
  }, [setRepositories, updateScore])

  // ── WebSocket 연결 ─────────────────────────────────────────────
  // DEV: 목 WebSocket (BE 없이 실시간 시뮬레이션)
  // PROD: 실제 BE WebSocket 연결
  useMockWebSocket()

  useEffect(() => {
    if (import.meta.env.DEV) return  // 개발 중엔 Mock 사용
    connectWebSocket()
    return () => disconnectWebSocket()
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ── 3D 캔버스 (전체 화면) ──────────────────────────────────── */}
      {/*
        사이드 패널이 열리면 캔버스를 살짝 왼쪽으로 밀어서 공간감을 준다.
        transition으로 부드럽게 이동.
      */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: isPanelOpen ? 'translateX(-80px)' : 'translateX(0)' }}
      >
        <Scene />
      </div>

      {/* ── 2D 오버레이 영역 ────────────────────────────────────────── */}

      {/* 접속 상태 + 타이틀 (좌상단) */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-mono pointer-events-none z-10 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400' : 'bg-white/20'}`}
          title={isConnected ? '실시간 연결됨' : '연결 대기'}
        />
        <span>GitHub Universe</span>
      </div>

      {/* 검색바 (상단 중앙) */}
      <SearchBar />

      {/* 호버 툴팁 */}
      <Tooltip />

      {/* 사이드 패널 (우측) */}
      <SidePanel />

      {/* 언어 범례 (좌하단) */}
      <Legend />

      {/* 도움말 (우하단) */}
      <HelpOverlay />

      {/* GitHub 로그인 버튼 (우상단) — 9~10주차 */}
      <LoginButton />

      {/* FPS 모니터 (DEV only, 우하단 위) */}
      <FrameMonitor />
    </div>
  )
}
