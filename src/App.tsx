import { useEffect, useCallback, useState } from 'react'
import Scene from '@/canvas/Scene'
import FrameMonitor from '@/canvas/effects/FrameMonitor'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { apiClient } from '@/api/axios'
import type { Repository, RepoScore } from '@/types/github'
import { useInterval } from '@/hooks/useInterval'
import { timeSince } from '@/utils/format'
// ── 2D UI 컴포넌트 ──────────────────────────────────────────────────
import SidePanel from '@/components/panel/SidePanel'
import Tooltip from '@/components/overlay/Tooltip'
import Legend from '@/components/overlay/Legend'
import HelpOverlay from '@/components/overlay/HelpOverlay'
import LoginButton from '@/components/overlay/LoginButton'
import SearchBar from '@/components/overlay/SearchBar'
import ProfileModal from '@/components/overlay/ProfileModal'
import FavoriteLoginModal from '@/components/overlay/FavoriteLoginModal'
import GalaxyStats from '@/components/overlay/GalaxyStats'
import ToastNotification from '@/components/overlay/ToastNotification'
import LandingPage from '@/pages/LandingPage'
import { useUIStore } from '@/store/useUIStore'

/** 폴링 간격: 5분 (스케줄러 갱신 주기와 맞춤) */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * 백엔드 GET /repos 응답 DTO
 */
interface RepoListItemDto {
  id: number
  fullName: string
  owner: string
  name: string
  description: string | null
  language: string | null
  brightnessScore: number
  activeScore: number
  healthScore: number
  sizeScore: number
  latestBucket: string | null
}

/**
 * App.tsx — 최상위 레이아웃
 *
 * 데이터 흐름:
 *  1. 첫 방문 → 랜딩 페이지 → "탐험 시작" 클릭
 *  2. GET /repos → 레포 목록 + 실제 메트릭 점수 로드
 *  3. 이후 5분마다 자동 폴링 (갱신 시 토스트 표시)
 *  4. GET /auth/me → 로그인 사용자 정보
 *  5. URL ?error= → OAuth 에러 토스트
 */
export default function App() {
  const { setRepositories, setScores, setConnected, setLastUpdatedAt, isConnected, lastUpdatedAt } = useGalaxyStore()
  const { setUser, showToast } = useUIStore()

  // ── 랜딩 페이지 표시 여부 ─────────────────────────────────────
  const [showLanding, setShowLanding] = useState(() => {
    try { return !localStorage.getItem('galaxy-visited') }
    catch { return false }
  })

  // 갱신 시각 표시용 타이머
  const [, setTick] = useState(0)

  // ── 레포 + 점수 로드 함수 ─────────────────────────────────────
  const loadRepos = useCallback((silent = false) => {
    apiClient.get<RepoListItemDto[]>('/repos')
      .then((res) => {
        const items = res.data
        if (!silent) console.log(`[App] 백엔드에서 레포 ${items.length}개 로드`)

        const repos: Repository[] = items.map((item) => ({
          id:          item.id,
          name:        item.name,
          fullName:    item.fullName,
          owner:       item.owner,
          description: item.description,
          language:    item.language,
        }))

        const scores: Record<number, RepoScore> = {}
        items.forEach((item) => {
          const hasMetrics = item.latestBucket !== null
          scores[item.id] = {
            repoId:        item.id,
            activityScore: hasMetrics ? Math.round(item.activeScore)  : 0,
            healthScore:   hasMetrics ? Math.round(item.healthScore)  : 50,
            sizeScore:     hasMetrics ? Math.round(item.sizeScore)    : 10,
            trendDelta:    0,
            updatedAt:     item.latestBucket ?? new Date().toISOString(),
          }
        })

        const latestBuckets = items
          .map((i) => i.latestBucket)
          .filter((b): b is string => b !== null)
        const newestBucket = latestBuckets.length > 0
          ? latestBuckets.reduce((a, b) => (a > b ? a : b))
          : null

        setRepositories(repos)
        setScores(scores)
        setConnected(true)
        if (newestBucket) setLastUpdatedAt(newestBucket)

        // 폴링 갱신 시 토스트 알림
        if (silent) showToast(`🔄 ${items.length}개 저장소 데이터 갱신`)
      })
      .catch((err) => {
        console.warn('[App] 백엔드 레포 로드 실패:', err.response?.status ?? err.message)
        setConnected(false)
      })
  }, [setRepositories, setScores, setConnected, setLastUpdatedAt, showToast])

  // ── 초기 로드 ─────────────────────────────────────────────────
  useEffect(() => { loadRepos(false) }, [loadRepos])

  // ── 5분 폴링 ─────────────────────────────────────────────────
  useInterval(() => loadRepos(true), POLL_INTERVAL_MS)

  // ── 매분 타이머 (갱신 시각 텍스트 새로 고침) ──────────────────
  useInterval(() => setTick((t) => t + 1), 60_000)

  // ── OAuth 에러 URL 파라미터 감지 ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('error')) {
      const reason = params.get('error')
      showToast(`⚠️ 로그인 실패: ${reason ?? '알 수 없는 오류'}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

  // ── 로그인 사용자 정보 — GET /auth/me ────────────────────────
  useEffect(() => {
    apiClient.get('/auth/me')
      .then((res) => { if (res.data?.githubLogin) setUser(res.data) })
      .catch(() => { /* 미로그인(401) → 무시 */ })
  }, [setUser])

  // ── 랜딩 → 메인 전환 ─────────────────────────────────────────
  const handleEnterGalaxy = () => {
    try { localStorage.setItem('galaxy-visited', '1') } catch { /* ignore */ }
    setShowLanding(false)
  }

  if (showLanding) {
    return (
      <div className="relative w-full h-full">
        <LandingPage onEnter={handleEnterGalaxy} />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* ── 3D 캔버스 ── */}
      <Scene />

      {/* ── 상태 표시 (좌상단) ── */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-mono pointer-events-none z-10 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-1000 ${
            isConnected ? 'bg-green-400' : 'bg-white/20'
          }`}
          title={isConnected ? '백엔드 연결됨' : '연결 대기 중'}
        />
        <span>GitHub Galaxy</span>
        {lastUpdatedAt && (
          <>
            <span className="text-white/20">·</span>
            <span className="text-white/25 text-[10px]">{timeSince(lastUpdatedAt)} 갱신</span>
          </>
        )}
      </div>

      {/* 검색바 */}
      <SearchBar />

      {/* 호버 툴팁 */}
      <Tooltip />

      {/* 사이드 패널 */}
      <SidePanel />

      {/* 언어 범례 (좌하단) */}
      <Legend />

      {/* 은하 통계 (범례 위) */}
      <GalaxyStats />

      {/* 조작 도움말 (우하단) */}
      <HelpOverlay />

      {/* 로그인 버튼 / 프로필 아바타 (우상단) */}
      <LoginButton />

      {/* ── 모달 레이어 ─────────────────────────────────────────── */}
      <ProfileModal />
      <FavoriteLoginModal />

      {/* ── 토스트 알림 ─────────────────────────────────────────── */}
      <ToastNotification />

      {/* FPS 모니터 (DEV only) */}
      <FrameMonitor />
    </div>
  )
}
