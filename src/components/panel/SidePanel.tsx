/**
 * SidePanel.tsx — 별 클릭 시 열리는 우측 상세 정보 패널
 *
 * v2 변경: 리사이즈 핸들 추가
 *  - 패널 왼쪽 가장자리에 드래그 핸들
 *  - 드래그 → 패널 너비 조절 (min 260px, max 600px)
 *  - 내부 그리드 (점수·메타)도 너비에 따라 2~3열 자동 전환
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useRepoDetail } from '@/hooks/queries/useRepoDetail'
import { useScoreHistory } from '@/hooks/queries/useScoreHistory'
import { formatCount, timeAgo } from '@/utils/format'
import ScoreChart from './ScoreChart'
import RAGAnalysis from './RAGAnalysis'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// ── 언어 → 색상 ───────────────────────────────────────────────────
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4f8ef7', JavaScript: '#f7d44f', Python:    '#4da8e0',
  Go:         '#00d4c8', Rust:       '#f07050', Java:      '#e8a24a',
  'C++':      '#e05080', Ruby:       '#d94040', Swift:     '#f05c30',
  Kotlin:     '#b06cff', PHP:        '#9090e0', 'C#':      '#68c060',
}

// ── 점수 → 레이블 ─────────────────────────────────────────────────
function activityLabel(score: number) {
  if (score >= 80) return { text: 'Hot',     cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
  if (score >= 50) return { text: 'Active',  cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
  if (score >= 25) return { text: 'Quiet',   cls: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
  return               { text: 'Dormant',    cls: 'bg-gray-800/60 text-gray-500 border-gray-700/30' }
}

function healthLabel(score: number) {
  if (score < 10)  return { text: '🕳️ Blackhole', cls: 'bg-red-900/40 text-red-300 border-red-800/40' }
  if (score < 35)  return { text: '⚠ Critical',   cls: 'bg-red-500/20 text-red-400 border-red-500/30' }
  if (score < 60)  return { text: 'Stable',        cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' }
  return               { text: 'Healthy',           cls: 'bg-green-500/20 text-green-300 border-green-500/30' }
}

// ── 리사이즈 상수 ────────────────────────────────────────────────
const MIN_WIDTH     = 260
const MAX_WIDTH     = 600
const DEFAULT_WIDTH = 320

// ─────────────────────────────────────────────────────────────────
export default function SidePanel() {
  const { selectedRepoId, isPanelOpen, closePanel, toggleFavorite, isFavorite } = useUIStore()
  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)

  const panelRef   = useRef<HTMLDivElement>(null)
  const favorite   = selectedRepoId ? isFavorite(selectedRepoId) : false

  // ── 리사이즈 상태 ────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const isResizingRef  = useRef(false)
  const startXRef      = useRef(0)
  const startWidthRef  = useRef(DEFAULT_WIDTH)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current  = true
    startXRef.current      = e.clientX
    startWidthRef.current  = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      // 왼쪽으로 드래그 = 패널 넓어짐 (오른쪽에 붙어 있으므로 부호 반대)
      const delta   = startXRef.current - e.clientX
      const newW    = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + delta))
      setPanelWidth(newW)
    }
    const onUp = () => {
      if (!isResizingRef.current) return
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── 기본 데이터 ──────────────────────────────────────────────
  const repo  = selectedRepoId ? repositories.find((r) => r.id === selectedRepoId) : null
  const score = selectedRepoId ? scores[selectedRepoId] : undefined

  // ── API 데이터 ───────────────────────────────────────────────
  const { data: detail,  isLoading: detailLoading  } = useRepoDetail(selectedRepoId)
  const { data: history, isLoading: historyLoading } = useScoreHistory(selectedRepoId)

  // ── ESC 키 닫기 ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanelOpen) closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPanelOpen, closePanel])

  // ── 패널 외부 클릭 닫기 ───────────────────────────────────────
  useEffect(() => {
    if (!isPanelOpen) return
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel()
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', onOutside), 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [isPanelOpen, closePanel])

  // ── 반응형 열 수 ─────────────────────────────────────────────
  const scoreCols = panelWidth >= 360 ? 3 : 2
  const metaCols  = panelWidth >= 360 ? 3 : 3  // meta는 항상 3열

  // ── 시각 파생값 ──────────────────────────────────────────────
  const langColor   = (repo?.language && LANGUAGE_COLORS[repo.language]) || '#aabbcc'
  const actBadge    = score ? activityLabel(score.activityScore) : null
  const healthBadge = score ? healthLabel(score.healthScore)     : null
  const trendSign   = score && score.trendDelta >= 0 ? '+' : ''

  return (
    <aside
      ref={panelRef}
      style={{ width: panelWidth }}
      className={`
        fixed top-0 right-0 h-full z-30
        max-w-[100vw]
        bg-black/95 border-l border-white/8
        backdrop-blur-xl shadow-2xl
        flex flex-col
        transform transition-transform duration-300 ease-out
        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      aria-label="저장소 상세 패널"
    >
      {/* ── 리사이즈 핸들 (왼쪽 가장자리) ─────────────────────── */}
      <div
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
        onMouseDown={onResizeStart}
      >
        {/* 호버 시 시각적 피드백 */}
        <div className="h-full w-full group-hover:bg-white/20 transition-colors duration-150" />
        {/* 핸들 중앙 점 3개 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-60 transition-opacity">
          {[0,1,2].map(i => (
            <div key={i} className="w-0.5 h-0.5 rounded-full bg-white/60" />
          ))}
        </div>
      </div>

      {/* ── 헤더 ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-5 pb-4 border-b border-white/5 flex-shrink-0 pl-5">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="text-white font-mono font-bold text-sm leading-tight truncate">
            {repo?.name ?? '...'}
          </h2>
          <p className="text-white/40 font-mono text-[10px] truncate mt-0.5">
            {repo?.fullName ?? ''}
          </p>
          {repo?.language && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: langColor, boxShadow: `0 0 5px ${langColor}60` }}
              />
              <span className="text-[11px] font-mono" style={{ color: langColor }}>
                {repo.language}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {repo?.htmlUrl && (
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
              title="GitHub에서 열기"
            >↗</a>
          )}
          <button
            onClick={closePanel}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none px-1"
            aria-label="패널 닫기"
          >×</button>
        </div>
      </div>

      {/* ── 스크롤 영역 ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 pl-5">

        {/* ── 점수 뱃지 ────────────────────────────────────────── */}
        {score && (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${scoreCols}, 1fr)` }}
          >
            <div className="bg-white/4 rounded-lg px-2 py-2.5 text-center border border-white/5">
              <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider mb-1">활동</p>
              <p className="text-xl font-mono font-bold text-blue-300">{score.activityScore}</p>
              {actBadge && (
                <span className={`text-[8px] font-mono px-1 py-0.5 rounded border ${actBadge.cls}`}>
                  {actBadge.text}
                </span>
              )}
            </div>
            <div className="bg-white/4 rounded-lg px-2 py-2.5 text-center border border-white/5">
              <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider mb-1">건강</p>
              <p className={`text-xl font-mono font-bold ${score.healthScore < 10 ? 'text-red-400' : score.healthScore < 40 ? 'text-orange-300' : 'text-emerald-300'}`}>
                {score.healthScore}
              </p>
              {healthBadge && (
                <span className={`text-[8px] font-mono px-1 py-0.5 rounded border ${healthBadge.cls}`}>
                  {healthBadge.text}
                </span>
              )}
            </div>
            {(scoreCols === 3) && (
              <div className="bg-white/4 rounded-lg px-2 py-2.5 text-center border border-white/5">
                <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider mb-1">트렌드</p>
                <p className={`text-xl font-mono font-bold ${score.trendDelta > 0 ? 'text-green-400' : score.trendDelta < 0 ? 'text-red-400' : 'text-white/50'}`}>
                  {trendSign}{score.trendDelta}
                </p>
                <span className="text-[8px] font-mono text-white/25">vs 이전</span>
              </div>
            )}
            {/* 좁은 뷰에서 트렌드는 인라인으로 */}
            {(scoreCols === 2) && score.trendDelta !== undefined && (
              <div className="col-span-2 flex items-center justify-between bg-white/3 rounded-lg px-3 py-1.5 border border-white/5">
                <span className="text-[9px] text-white/35 font-mono uppercase tracking-wider">트렌드</span>
                <span className={`text-sm font-mono font-bold ${score.trendDelta > 0 ? 'text-green-400' : score.trendDelta < 0 ? 'text-red-400' : 'text-white/50'}`}>
                  {trendSign}{score.trendDelta}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 메타 정보 ────────────────────────────────────────── */}
        {repo && (
          <div
            className="grid gap-x-2 gap-y-1.5 text-center"
            style={{ gridTemplateColumns: `repeat(${metaCols}, 1fr)` }}
          >
            {[
              { label: '⭐ Stars',  value: formatCount(repo.starCount) },
              { label: '🍴 Forks',  value: formatCount(repo.forkCount) },
              { label: '🐛 Issues', value: formatCount(repo.openIssueCount) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/3 rounded-md px-2 py-1.5">
                <p className="text-[9px] text-white/30 font-mono">{label}</p>
                <p className="text-xs text-white/70 font-mono font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {repo && (
          <p className="text-[10px] text-white/25 font-mono">
            마지막 푸시: {timeAgo(repo.pushedAt)}
          </p>
        )}

        {/* ── Topics 태그 ─────────────────────────────────────── */}
        {repo && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {repo.topics.slice(0, 10).map((topic) => (
              <span
                key={topic}
                className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* ── 설명 ─────────────────────────────────────────────── */}
        {(detail ?? repo)?.description && (
          <p className="text-[11px] text-white/40 font-mono leading-relaxed line-clamp-3">
            {(detail ?? repo)?.description}
          </p>
        )}

        {/* ── 점수 차트 ──────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2">24시간 점수 추이</p>
          {historyLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : history && history.length > 0 ? (
            <ScoreChart data={history} height={80} />
          ) : (
            <p className="text-[11px] text-white/25 font-mono py-3 text-center">데이터 없음</p>
          )}
        </div>

        {detailLoading && (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-[11px] text-white/25 font-mono">상세 정보 로딩 중...</span>
          </div>
        )}

        {/* ── RAG 분석 ─────────────────────────────────────────── */}
        {selectedRepoId && repo && (
          <RAGAnalysis repoId={selectedRepoId} repoName={repo.fullName} />
        )}
      </div>

      {/* ── 하단: My Galaxy 토글 ──────────────────────────────────── */}
      {selectedRepoId && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 pl-5">
          <button
            onClick={() => toggleFavorite(selectedRepoId)}
            className={`
              w-full flex items-center justify-center gap-2
              py-2 rounded-lg border text-xs font-mono
              transition-all duration-150
              ${favorite
                ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25'
                : 'bg-white/4 border-white/10 text-white/50 hover:bg-white/8 hover:text-white/80'
              }
            `}
          >
            <span className="text-base">{favorite ? '⭐' : '☆'}</span>
            {favorite ? 'My Galaxy에서 제거' : 'My Galaxy에 추가'}
          </button>
        </div>
      )}
    </aside>
  )
}
