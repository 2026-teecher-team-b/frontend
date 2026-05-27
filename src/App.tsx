import { lazy, Suspense, useEffect, useCallback, useState } from 'react'
import FrameMonitor from '@/canvas/effects/FrameMonitor'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { apiClient } from '@/api/axios'
import type { Repository, RepoScore } from '@/types/github'
import { useInterval } from '@/hooks/useInterval'
import { timeSince } from '@/utils/format'
// ── 2D UI 컴포넌트 ──────────────────────────────────────────────────
import ErrorBoundary from '@/components/common/ErrorBoundary'
import Tooltip from '@/components/overlay/Tooltip'
import Legend from '@/components/overlay/Legend'
import HelpOverlay from '@/components/overlay/HelpOverlay'
import LoginButton from '@/components/overlay/LoginButton'
import FavoriteLoginModal from '@/components/overlay/FavoriteLoginModal'
import GalaxyStats from '@/components/overlay/GalaxyStats'
import ToastNotification from '@/components/overlay/ToastNotification'
import LandingPage from '@/pages/LandingPage'
import { useUIStore } from '@/store/useUIStore'

const Scene = lazy(() => import('@/canvas/Scene'))
const SidePanel = lazy(() => import('@/components/panel/SidePanel'))
const SearchBar = lazy(() => import('@/components/overlay/SearchBar'))
const ProfileModal = lazy(() => import('@/components/overlay/ProfileModal'))

/** 폴링 간격: 5분 (스케줄러 갱신 주기와 맞춤) */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * 백엔드 점수 정규화 — 데이터셋 내 상대 분포로 리스케일
 *
 * 문제: 백엔드 calcHealthScore = hourlyAvg × 20.
 *       일반 GitHub 레포 활동량(<<0.1 events/hr) → healthScore < 2 → 전부 블랙홀.
 *
 * 해결: 데이터가 있는 레포들 중 p95 기준으로 정규화.
 *   - 상위 5%  → 80~100점 (밝은 별)
 *   - 중간     → 20~60점  (보통 별)
 *   - 하위 5%  → 5~15점   (희미한 별)
 *   - 데이터 없음 → 건강도 5점 (블랙홀 임계값 초과, 희미하게 표시)
 *
 * 블랙홀은 원시 점수가 0이고 latestBucket도 없는 진짜 무데이터 레포만 해당.
 */
/**
 * ID 기반 결정론적 의사난수 (0~1)
 * 배치 데이터 없을 때 레포마다 다른 시각 속성 부여용.
 */
function pseudoRand(seed: number): number {
  const h = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b)
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff
}

function normalizeScores(
  rawScores: Record<number, RepoScore>,
  items: RepoListItemDto[],
): Record<number, RepoScore> {
  const result: Record<number, RepoScore> = {}

  // 실제 의미있는 점수가 있는 레포 분리
  const activeItems  = items.filter(i => {
    const s = rawScores[i.id]
    return s && (s.healthScore > 0 || s.activityScore > 0 || s.sizeScore > 0)
  })

  // ── 케이스 A: 배치 미실행 → 전체 점수가 0 ─────────────────────────
  // ID 기반 결정론적 분포로 은하를 채움 (블랙홀 없음, 다양한 크기/밝기)
  if (activeItems.length === 0) {
    console.info('[App] 배치 데이터 없음 — ID 기반 시각 분산 적용')
    items.forEach(item => {
      const r1 = pseudoRand(item.id)
      const r2 = pseudoRand(item.id * 7 + 3)
      const r3 = pseudoRand(item.id * 13 + 5)
      result[item.id] = {
        ...rawScores[item.id],
        // 정규분포 느낌: 중간대가 많고 양 극단이 적음
        healthScore:   Math.round(15 + r1 * 70),   // 15~85
        activityScore: Math.round(10 + r2 * 65),   // 10~75
        sizeScore:     Math.round(12 + r3 * 68),   // 12~80
        trendDelta:    0,
      }
    })
    return result
  }

  // ── 케이스 B: 일부만 점수 있음 → 혼합 처리 ────────────────────────
  const rawHealth = activeItems.map(i => rawScores[i.id].healthScore)
  const rawAct    = activeItems.map(i => rawScores[i.id].activityScore)
  const rawSize   = activeItems.map(i => rawScores[i.id].sizeScore)

  /** n번째 백분위 값 */
  const pct = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length * p)] ?? s[s.length - 1]
  }

  /** p5~p95 구간 → targetMin~targetMax (제곱근 스케일) */
  const mapRange = (v: number, lo: number, hi: number, tLo: number, tHi: number) => {
    if (hi <= lo) return (tLo + tHi) / 2
    const t = Math.sqrt(Math.max(0, Math.min(1, (v - lo) / (hi - lo))))
    return tLo + t * (tHi - tLo)
  }

  const hLo = pct(rawHealth, 0.05), hHi = pct(rawHealth, 0.95)
  const aLo = pct(rawAct,    0.05), aHi = pct(rawAct,    0.95)
  const sLo = pct(rawSize,   0.05), sHi = pct(rawSize,   0.95)

  const activeIds = new Set(activeItems.map(i => i.id))

  items.forEach(item => {
    const raw = rawScores[item.id]

    if (!activeIds.has(item.id)) {
      // latestBucket 없거나 점수 전부 0인데 배치는 돌았음 → 희미한 별
      const r = pseudoRand(item.id)
      result[item.id] = {
        ...raw,
        healthScore:   Math.round(8  + r * 20),  // 8~28 (블랙홀 임계값 2 초과)
        activityScore: Math.round(3  + r * 15),
        sizeScore:     Math.round(5  + r * 18),
        trendDelta: 0,
      }
      return
    }

    // 정규화 적용
    const health = Math.max(3,  Math.min(100, Math.round(mapRange(raw.healthScore,  hLo, hHi, 8,  95))))
    const act    = Math.max(1,  Math.min(100, Math.round(mapRange(raw.activityScore, aLo, aHi, 3, 90))))
    const size   = Math.max(3,  Math.min(100, Math.round(mapRange(raw.sizeScore,    sLo, sHi, 5,  95))))

    // trendDelta: 활동 상위 15% → 양수, 하위 15% → 음수
    const rank = rawAct.filter(v => v <= raw.activityScore).length / rawAct.length
    const trendDelta = rank > 0.85 ? +(rank * 20).toFixed(1)
                     : rank < 0.15 ? -((1 - rank) * 20).toFixed(1)
                     : 0

    result[item.id] = { ...raw, healthScore: health, activityScore: act, sizeScore: size, trendDelta }
  })

  return result
}

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
  starCount: number | null
  forkCount: number | null
  openIssueCount: number | null
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
  const { setUser, showToast, loadFavorites } = useUIStore()

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
          id:             item.id,
          name:           item.name,
          fullName:       item.fullName,
          owner:          item.owner,
          description:    item.description,
          language:       item.language,
          starCount:      item.starCount ?? undefined,
          forkCount:      item.forkCount ?? undefined,
          openIssueCount: item.openIssueCount ?? undefined,
        }))

        // ① 원시 float 값 보존 (Math.round 제거 — 정규화 정밀도 향상)
        const rawScores: Record<number, RepoScore> = {}
        items.forEach((item) => {
          const hasMetrics = item.latestBucket !== null
          rawScores[item.id] = {
            repoId:        item.id,
            activityScore: hasMetrics ? item.activeScore  : 0,
            healthScore:   hasMetrics ? item.healthScore  : 0,  // 없으면 0 → normalizeScores에서 5로 처리
            sizeScore:     hasMetrics ? item.sizeScore    : 0,
            trendDelta:    0,
            updatedAt:     item.latestBucket ?? new Date().toISOString(),
          }
        })

        // ② 데이터셋 상대 분포 기준 정규화 → 별 스펙트럼 생성
        const scores = normalizeScores(rawScores, items)

        if (!silent) {
          const blackholes = Object.values(scores).filter(s => s.healthScore < 2).length
          console.log(`[App] 정규화 완료 — 별: ${items.length - blackholes}개, 블랙홀: ${blackholes}개`)
        }

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
  useEffect(() => { 
    if (showLanding) return
    loadRepos(false)
  }, [showLanding, loadRepos])

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
    if (showLanding) return

    apiClient.get('/auth/me')
      .then((res) => {
        if (res.data?.githubLogin) {
          setUser(res.data)
          loadFavorites() // 로그인 확인 후 DB에서 즐겨찾기 목록 로드
        }
      })
      .catch(() => { /* 미로그인(401) → 무시 */ })
  }, [showLanding, setUser, loadFavorites])

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
      {/* ── 3D 캔버스 — WebGL 에러 격리 ── */}
      <ErrorBoundary
        fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#01020a] text-white/50 font-mono gap-3">
            <span className="text-3xl">🌌</span>
            <p className="text-xs">WebGL 초기화에 실패했습니다.</p>
            <button onClick={() => window.location.reload()} className="text-xs underline hover:text-white/80 transition-colors">
              새로고침
            </button>
          </div>
        }
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </ErrorBoundary>

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

      <Suspense fallback={null}>
        <SearchBar />
        <SidePanel />
        <ProfileModal />
      </Suspense>

      {/* 호버 툴팁 */}
      <Tooltip />

      {/* 언어 범례 (좌하단) */}
      <Legend />

      {/* 은하 통계 (범례 위) */}
      <GalaxyStats />

      {/* 조작 도움말 (우하단) */}
      <HelpOverlay />

      {/* 로그인 버튼 / 프로필 아바타 (우상단) */}
      <LoginButton />

      {/* ── 모달 레이어 ─────────────────────────────────────────── */}
      <FavoriteLoginModal />

      {/* ── 토스트 알림 ─────────────────────────────────────────── */}
      <ToastNotification />

      {/* FPS 모니터 (DEV only) */}
      <FrameMonitor />
    </div>
  )
}
