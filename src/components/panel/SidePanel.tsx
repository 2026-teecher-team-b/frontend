/**
 * SidePanel.tsx — 저장소 상세 패널 (HUD 리디자인)
 *
 * 반응형:
 *  - 모바일(< 768px): 바텀시트 (75vh)
 *  - 데스크톱(≥ 768px): 우측 사이드패널 (260~600px, 드래그 리사이즈)
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useTimeline } from '@/hooks/queries/useTimeline'
import { useTrendReason } from '@/hooks/queries/useTrendReason'
import { useRepoStats } from '@/hooks/queries/useRepoStats'
import { useIsMobile } from '@/hooks/useIsMobile'
import ScoreChart from './ScoreChart'
import RAGAnalysis from './RAGAnalysis'
import { timeAgo, formatCount } from '@/utils/format'
import { BLACKHOLE_HEALTH_THRESHOLD, getLanguageColor } from '@/utils/physics'

export default function SidePanel() {
  const { isPanelOpen, selectedRepoId, closePanel, toggleFavorite, isFavorite } = useUIStore()
  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)
  const isMobile     = useIsMobile()

  const repo  = selectedRepoId ? repositories.find((r) => r.id === selectedRepoId) : null
  const score = selectedRepoId ? scores[selectedRepoId] : undefined
  const fav   = selectedRepoId ? isFavorite(selectedRepoId) : false

  const repoOwner  = repo ? (repo.owner ?? repo.fullName.split('/')[0]) : ''
  const repoName   = repo?.name ?? ''
  const active     = isPanelOpen && !!repo

  // 활동 타임라인 (시간별 점수) — 활동 차트용
  const { data: history } = useTimeline(
    active ? repoOwner : null,
    active ? repoName : null,
    selectedRepoId,
  )

  // 점수(활동) 변화 이유 — LLM 생성 설명
  const { data: trend, isLoading: trendLoading, isError: trendError } = useTrendReason(
    active ? repoOwner : null,
    active ? repoName : null,
  )

  // 스타/포크/이슈 수: 목록 API(/repos)가 기본 제공.
  // 일부 값이 비어 있을 때만 검색 API(/repos/search)로 보강 → 평소엔 추가 요청 없음.
  const needStats = active &&
    (repo?.starCount == null || repo?.forkCount == null || repo?.openIssueCount == null)
  const { data: stats } = useRepoStats(
    needStats ? (repo?.fullName ?? null) : null,
    selectedRepoId,
  )

  // 통계 표시값: store(목록 API) 우선, 없으면 검색 API로 폴백
  const starCount  = repo?.starCount      ?? stats?.starCount
  const forkCount  = repo?.forkCount      ?? stats?.forkCount
  const issueCount = repo?.openIssueCount ?? stats?.openIssueCount

  const [panelWidth, setPanelWidth] = useState(320)
  const dragging = useRef(false)
  const startX   = useRef(0)
  const startW   = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    if (isMobile) return
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = panelWidth
    e.preventDefault()
  }, [panelWidth, isMobile])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPanelWidth(Math.max(260, Math.min(600, startW.current - (e.clientX - startX.current))))
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePanel])

  const langColor  = getLanguageColor(repo?.language ?? null)
  const isBlackHole = (score?.healthScore ?? 50) < BLACKHOLE_HEALTH_THRESHOLD

  const containerStyle = isMobile
    ? {
        bottom: 0, left: 0, right: 0,
        height: '75vh',
        transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        top: 0, right: 0,
        width: panelWidth,
        height: '100%',
        transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
      }

  const panelBg     = 'rgba(0,8,22,0.95)'
  const panelBorder = 'rgba(0,212,255,0.16)'

  return (
    <div
      className="absolute z-30 flex transition-transform duration-300 ease-out"
      style={containerStyle}
    >
      {/* Desktop resize handle */}
      {!isMobile && (
        <div
          onMouseDown={onResizeStart}
          className="w-1 h-full cursor-col-resize flex-shrink-0 transition-colors"
          style={{ background: 'rgba(0,212,255,0.06)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.20)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)')}
        />
      )}

      {/* ── Panel body ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto flex flex-col"
        style={{
          background:     panelBg,
          borderLeft:     isMobile ? 'none' : `1px solid ${panelBorder}`,
          borderTop:      isMobile ? `1px solid ${panelBorder}` : 'none',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Mobile drag indicator */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
            <div className="w-10 h-0.5" style={{ background: 'rgba(0,212,255,0.25)' }} />
          </div>
        )}

        {/* ── Panel header ──────────────────────────────────────── */}
        <div
          className="flex items-start justify-between p-4 sticky top-0 flex-shrink-0"
          style={{
            borderBottom:   `1px solid rgba(0,212,255,0.10)`,
            background:     'rgba(0,6,18,0.90)',
            backdropFilter: 'blur(12px)',
            zIndex: 10,
          }}
        >
          <div className="flex-1 min-w-0 pr-2">
            {repo ? (
              <>
                {/* Section label */}
                <p className="text-[10px] tracking-[0.22em] uppercase mb-1.5" style={{ color: 'rgba(0,212,255,0.40)' }}>
                  ◈ 저장소 정보
                </p>
                <div className="flex items-center gap-2 mb-0.5">
                  {repo.language && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: langColor,
                        boxShadow: `0 0 6px ${langColor}`,
                      }}
                    />
                  )}
                  <h2
                    className="font-bold text-lg truncate"
                    style={{ color: isBlackHole ? '#ff3e3e' : 'rgba(255,255,255,0.92)' }}
                  >
                    {repo.name}
                  </h2>
                  {isBlackHole && (
                    <span className="text-[10px] tracking-widest flex-shrink-0" style={{ color: '#ff3e3e' }}>
                      ⬤ 블랙홀
                    </span>
                  )}
                </div>
                <p className="text-[12px] truncate" style={{ color: 'rgba(0,212,255,0.42)' }}>
                  {repo.fullName}
                </p>
              </>
            ) : (
              <div className="h-10 animate-pulse" style={{ background: 'rgba(0,212,255,0.06)' }} />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedRepoId && (
              <button
                onClick={() => toggleFavorite(selectedRepoId)}
                className="text-base transition-all cursor-pointer"
                style={{ color: fav ? '#ffc23a' : 'rgba(0,212,255,0.22)' }}
                onMouseEnter={(e) => {
                  if (!fav) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,194,58,0.55)'
                }}
                onMouseLeave={(e) => {
                  if (!fav) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.22)'
                }}
                title={fav ? 'UNTRACK' : 'TRACK'}
              >★</button>
            )}
            <button
              onClick={closePanel}
              className="w-6 h-6 flex items-center justify-center text-[10px] transition-all cursor-pointer"
              style={{
                color:      'rgba(0,212,255,0.40)',
                border:     '1px solid rgba(0,212,255,0.15)',
                background: 'rgba(0,212,255,0.04)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#00d4ff'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.45)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.40)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.15)'
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        {repo ? (
          <div className="p-4 space-y-4 flex-1">

            {/* Score metrics */}
            {score && (
              <>
                <p className="text-[11px] tracking-[0.22em] uppercase" style={{ color: 'rgba(0,212,255,0.35)' }}>
                  ▸ 성능 지표
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '활성도', value: score.activityScore, color: '#00d4ff' },
                    {
                      label: '건강도',
                      value: score.healthScore,
                      color: score.healthScore < BLACKHOLE_HEALTH_THRESHOLD
                        ? '#ff3e3e'
                        : score.healthScore < 40
                        ? '#ffaa00'
                        : '#00ff88',
                    },
                    {
                      label: '트렌드 Δ',
                      value: `${score.trendDelta > 0 ? '+' : ''}${score.trendDelta.toFixed(0)}`,
                      color: score.trendDelta > 0 ? '#00ff88' : score.trendDelta < 0 ? '#ff3e3e' : 'rgba(0,212,255,0.55)',
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="relative p-2.5 text-center"
                      style={{
                        background: 'rgba(0,212,255,0.03)',
                        border:     '1px solid rgba(0,212,255,0.10)',
                      }}
                    >
                      <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.40)' }} />
                      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.40)' }} />
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'rgba(0,212,255,0.32)' }}>{label}</p>
                      <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 점수 변화 이유 (활동 트렌드) */}
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(0,212,255,0.35)' }}>
                ▸ 점수 변화 이유
              </p>
              {trendLoading && (
                <p className="text-[12px] font-mono" style={{ color: 'rgba(0,212,255,0.30)' }}>
                  분석 중…
                </p>
              )}
              {!trendLoading && trendError && (
                <p className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  변화 이유를 불러오지 못했습니다.
                </p>
              )}
              {!trendLoading && trend && (() => {
                const tColor =
                  trend.trend === '상승' ? '#00ff88'
                  : trend.trend === '하락' ? '#ff3e3e'
                  : 'rgba(0,212,255,0.55)'
                const arrow = trend.trend === '상승' ? '▲' : trend.trend === '하락' ? '▼' : '─'
                const rateText = `${trend.changeRate > 0 ? '+' : ''}${trend.changeRate.toFixed(1)}%`
                return (
                  <div
                    className="p-2.5 space-y-1.5"
                    style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.10)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold tracking-widest" style={{ color: tColor }}>
                        {arrow} {trend.trend}
                      </span>
                      <span className="text-[13px] font-mono tabular-nums" style={{ color: tColor }}>
                        {rateText}
                      </span>
                      <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(0,212,255,0.25)' }}>
                        7일 평균 대비
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.66)' }}>
                      {trend.reason}
                    </p>
                  </div>
                )
              })()}
            </div>

            {/* Stats */}
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(0,212,255,0.35)' }}>
                ▸ 저장소 통계
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: '스타', value: starCount  != null ? formatCount(starCount)        : '—', color: '#ffc23a' },
                  { label: '포크', value: forkCount  != null ? formatCount(forkCount)        : '—', color: 'rgba(255,255,255,0.78)' },
                  { label: '이슈', value: issueCount != null ? formatCount(issueCount)       : '—', color: 'rgba(255,255,255,0.78)' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="p-2.5"
                    style={{
                      background: 'rgba(0,212,255,0.02)',
                      border:     '1px solid rgba(0,212,255,0.08)',
                    }}
                  >
                    <p className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(0,212,255,0.30)' }}>{label}</p>
                    <p className="text-base font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-1.5 text-[13px]">
              {repo.language && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
                  <span style={{ color: 'rgba(255,255,255,0.50)' }}>{repo.language}</span>
                </div>
              )}
              {(repo.pushedAt ?? repo.lastCollectedAt) && (
                <p style={{ color: 'rgba(0,212,255,0.30)' }}>
                  최근 업데이트: {timeAgo(repo.pushedAt ?? repo.lastCollectedAt ?? '')}
                </p>
              )}
              {repo.description && (
                <p className="leading-relaxed pt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {repo.description}
                </p>
              )}
            </div>

            {/* Topics */}
            {repo.topics && repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {repo.topics.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-1 tracking-widest uppercase"
                    style={{
                      color:      'rgba(0,212,255,0.60)',
                      background: 'rgba(0,212,255,0.06)',
                      border:     '1px solid rgba(0,212,255,0.16)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Score chart (desktop only) */}
            {!isMobile && history && history.length > 0 && (
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(0,212,255,0.35)' }}>
                  ▸ 활동 타임라인
                </p>
                <ScoreChart scores={history} width={panelWidth - 48} />
              </div>
            )}

            {/* AI analysis */}
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: 'rgba(0,212,255,0.35)' }}>
                ▸ AI 분석
              </p>
              <RAGAnalysis owner={repoOwner} repo={repoName} />
            </div>

            {/* GitHub link */}
            <a
              href={repo.htmlUrl ?? `https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 text-[12px] tracking-[0.18em] uppercase transition-all cursor-pointer"
              style={{
                color:      'rgba(0,212,255,0.50)',
                background: 'rgba(0,212,255,0.03)',
                border:     '1px solid rgba(0,212,255,0.12)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#00d4ff'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.38)'
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.06)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(0,212,255,0.50)'
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.12)'
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.03)'
              }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              GitHub에서 보기 ↗
            </a>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="text-2xl" style={{ color: 'rgba(0,212,255,0.15)' }}>◈</span>
            <p className="text-[12px] tracking-[0.22em] uppercase" style={{ color: 'rgba(0,212,255,0.25)' }}>
              {isMobile ? '별을 탭하면 정보를 볼 수 있어요' : '별을 클릭하면 정보를 볼 수 있어요'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
