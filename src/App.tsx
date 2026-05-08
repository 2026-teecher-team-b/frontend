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
import { useUIStore } from '@/store/useUIStore'

/** 폴링 간격: 5분 (스케줄러 갱신 주기와 맞춤) */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * 백엔드 GET /repos 응답 DTO
 * RepoListItemDto (Java record) 필드와 1:1 매핑
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
  latestBucket: string | null  // ISO-8601 (nullable — 메트릭이 없으면 null)
}

/**
 * App.tsx — 최상위 레이아웃
 *
 * 데이터 흐름:
 *  1. 앱 시작 → GET /repos → 레포 목록 + 실제 메트릭 점수 로드
 *  2. 이후 5분마다 자동 재요청 (스케줄러 갱신 주기에 맞춤)
 *  3. GET /auth/me → 로그인 사용자 정보 (실패 시 무시)
 *
 * WebSocket/SSE 미사용 이유:
 *  스케줄러가 10~30분마다 DB를 갱신하므로 초단위 푸시는 의미 없음.
 *  5분 폴링으로 사용자 체감 실시간성 확보.
 */
export default function App() {
  const { setRepositories, setScores, setConnected, setLastUpdatedAt, isConnected, lastUpdatedAt } = useGalaxyStore()
  const { setUser } = useUIStore()

  // 갱신 시각 표시용 타이머 (매분 갱신)
  const [, setTick] = useState(0)

  // ── 레포 + 점수 로드 함수 ─────────────────────────────────────
  const loadRepos = useCallback(() => {
    apiClient.get<RepoListItemDto[]>('/repos')
      .then((res) => {
        const items = res.data
        console.log(`[App] 백엔드에서 레포 ${items.length}개 로드`)

        // ── Repository 배열 구성 ──────────────────────────────
        const repos: Repository[] = items.map((item) => ({
          id: item.id,
          name: item.name,
          fullName: item.fullName,
          owner: item.owner,
          description: item.description,
          language: item.language,
        }))

        // ── 실제 메트릭 점수 맵 구성 ─────────────────────────
        // activeScore  → activityScore (별의 Y 위치, 깔때기 높이)
        // healthScore  → healthScore   (색상, 블랙홀 여부)
        // sizeScore    → sizeScore     (별의 기본 크기)
        //
        // ⚠ 메트릭 없는 레포(latestBucket=null) 기본값:
        //   healthScore=50 → 블랙홀 방지 (스케줄러가 아직 수집 안 한 것뿐)
        //   activityScore=0 → 깔때기 아래 배치 (활동 미확인)
        //   sizeScore=10   → 작은 별로 표시
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

        // ── 가장 최근 latestBucket 산출 ──────────────────────
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
      })
      .catch((err) => {
        console.warn('[App] 백엔드 레포 로드 실패:', err.response?.status ?? err.message)
        setConnected(false)
      })
  }, [setRepositories, setScores, setConnected, setLastUpdatedAt])

  // ── 초기 로드 ─────────────────────────────────────────────────
  useEffect(() => {
    loadRepos()
  }, [loadRepos])

  // ── 5분마다 자동 폴링 ─────────────────────────────────────────
  useInterval(loadRepos, POLL_INTERVAL_MS)

  // ── 갱신 시각 표시 타이머 (매분 re-render) ────────────────────
  useInterval(() => setTick((t) => t + 1), 60_000)

  // ── 로그인 사용자 정보 조회 — GET /auth/me ───────────────────
  useEffect(() => {
    apiClient.get('/auth/me')
      .then((res) => {
        if (res.data?.githubLogin) setUser(res.data)
      })
      .catch(() => {
        // 미로그인(401) → 무시
      })
  }, [setUser])

  return (
    <div className="relative w-full h-full">
      {/* ── 3D 캔버스 (전체 화면) ── */}
      <Scene />

      {/* ── 2D 오버레이 영역 ────────────────────────────────────────── */}

      {/* 상태 표시 (좌상단) */}
      <div className="absolute top-4 left-4 text-xs text-white/40 font-mono pointer-events-none z-10 flex items-center gap-2">
        {/* 데이터 로드 상태 도트 */}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-1000 ${
            isConnected ? 'bg-green-400' : 'bg-white/20'
          }`}
          title={isConnected ? '백엔드 연결됨' : '연결 대기 중'}
        />
        <span>GitHub Universe</span>

        {/* 마지막 갱신 시각 */}
        {lastUpdatedAt && (
          <>
            <span className="text-white/20">·</span>
            <span className="text-white/25 text-[10px]">
              {timeSince(lastUpdatedAt)} 갱신
            </span>
          </>
        )}
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

      {/* GitHub 로그인 버튼 */}
      <LoginButton />

      {/* FPS 모니터 (DEV only) */}
      <FrameMonitor />
    </div>
  )
}
