/**
 * SidePanel.tsx — 저장소 상세 패널
 *
 * 반응형 레이아웃:
 *  - 모바일(< 768px): 하단에서 위로 슬라이드하는 바텀시트 (화면 75% 높이)
 *  - 데스크톱(≥ 768px): 우측에서 슬라이드 (260~600px 너비, 드래그로 조절 가능)
 *
 * 기타 기능:
 *  - ScoreChart: 24h 점수 스파크라인
 *  - RAGAnalysis: AI 분석 질의응답
 *  - ESC / X 버튼 / 빈 화면 클릭으로 닫기
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useScoreHistory } from '@/hooks/queries/useScoreHistory'
import { useIsMobile } from '@/hooks/useIsMobile'
import ScoreChart from './ScoreChart'
import RAGAnalysis from './RAGAnalysis'
import { timeAgo } from '@/utils/format'
import { BLACKHOLE_HEALTH_THRESHOLD, getLanguageColor } from '@/utils/physics'

export default function SidePanel() {
  const { isPanelOpen, selectedRepoId, closePanel, toggleFavorite, isFavorite } = useUIStore()
  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)
  const isMobile     = useIsMobile()

  const repo  = selectedRepoId ? repositories.find((r) => r.id === selectedRepoId) : null
  const score = selectedRepoId ? scores[selectedRepoId] : undefined
  const fav   = selectedRepoId ? isFavorite(selectedRepoId) : false

  const { data: history } = useScoreHistory(isPanelOpen ? selectedRepoId : null)

  // ── 데스크톱 전용: 패널 너비 드래그 리사이즈 ─────────────────────
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
      const newW = Math.max(260, Math.min(600, startW.current - (e.clientX - startX.current)))
      setPanelWidth(newW)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ESC 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePanel])

  const langColor = getLanguageColor(repo?.language ?? null)
  const repoOwner = repo ? (repo.owner ?? repo.fullName.split('/')[0]) : ''
  const repoName  = repo?.name ?? ''

  // ── 반응형 레이아웃 스타일 ────────────────────────────────────────
  // 모바일: 바텀시트 (하단에서 위로), 데스크톱: 우측 사이드패널
  const containerStyle = isMobile
    ? {
        // 모바일: 전체 너비, 화면 75% 높이, 하단 고정
        bottom: 0, left: 0, right: 0,
        height: '75vh',
        transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        // 데스크톱: 우측 고정, 전체 높이
        top: 0, right: 0,
        width: panelWidth,
        height: '100%',
        transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <div
      className="absolute z-30 flex transition-transform duration-300 ease-out"
      style={containerStyle}
    >
      {/* ── 데스크톱: 좌측 리사이즈 핸들 ──────────────────────────── */}
      {!isMobile && (
        <div
          onMouseDown={onResizeStart}
          className="w-1 h-full cursor-col-resize hover:bg-white/10 transition-colors flex-shrink-0"
        />
      )}

      {/* ── 패널 본체 ──────────────────────────────────────────────── */}
      <div className={`
        flex-1 bg-black/80 backdrop-blur-xl border-white/8 overflow-y-auto flex flex-col
        ${isMobile
          ? 'border-t rounded-t-2xl'
          : 'border-l'
        }
      `}>
        {/* ── 모바일: 드래그 핸들 인디케이터 ───────────────────────── */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}

        {/* ── 헤더 ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-4 border-b border-white/8 sticky top-0 bg-black/60 backdrop-blur-md z-10">
          <div className="flex-1 min-w-0 pr-2">
            {repo ? (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  {repo.language && (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: langColor, boxShadow: `0 0 6px ${langColor}` }} />
                  )}
                  <h2 className="text-white font-mono font-bold text-sm truncate">{repo.name}</h2>
                </div>
                <p className="text-white/40 text-[10px] font-mono truncate">{repo.fullName}</p>
              </>
            ) : (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedRepoId && (
              <button
                onClick={() => toggleFavorite(selectedRepoId)}
                className={`text-lg transition-all ${fav ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/60'}`}
                title={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >★</button>
            )}
            <button
              onClick={closePanel}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/80 transition-all text-sm"
            >✕</button>
          </div>
        </div>

        {/* ── 컨텐츠 ────────────────────────────────────────────────── */}
        {repo ? (
          <div className="p-4 space-y-4 flex-1">
            {/* 점수 카드 */}
            {score && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '활동', value: score.activityScore, color: '#4f8ef7' },
                  { label: '건강', value: score.healthScore,   color: score.healthScore < BLACKHOLE_HEALTH_THRESHOLD ? '#f87171' : score.healthScore < 40 ? '#fb923c' : '#4ade80' },
                  { label: '트렌드', value: `${score.trendDelta > 0 ? '+' : ''}${score.trendDelta.toFixed(0)}`, color: score.trendDelta > 0 ? '#4ade80' : '#f87171' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/4 rounded-lg p-2.5 text-center border border-white/5">
                    <p className="text-[9px] text-white/30 font-mono mb-1">{label}</p>
                    <p className="text-sm font-mono font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 통계 — 모바일에서 더 컴팩트하게 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Stars',  value: repo.starCount != null ? String(repo.starCount) : '—' },
                { label: 'Forks',  value: repo.forkCount != null ? String(repo.forkCount) : '—' },
                { label: 'Issues', value: repo.openIssueCount != null ? String(repo.openIssueCount) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/3 rounded-lg p-2 border border-white/5">
                  <p className="text-[8px] text-white/30 font-mono">{label}</p>
                  <p className="text-xs font-mono text-white/70 font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {/* 메타 정보 */}
            <div className="space-y-1.5 text-[10px] font-mono">
              {repo.language && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
                  <span className="text-white/50">{repo.language}</span>
                </div>
              )}
              {(repo.pushedAt ?? repo.lastCollectedAt) && (
                <p className="text-white/30">
                  마지막 업데이트: {timeAgo(repo.pushedAt ?? repo.lastCollectedAt ?? '')}
                </p>
              )}
              {repo.description && (
                <p className="text-white/50 leading-relaxed pt-1">{repo.description}</p>
              )}
            </div>

            {/* 토픽 */}
            {repo.topics && repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {repo.topics.map((t) => (
                  <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300/70 border border-blue-400/15">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* 점수 차트 (데스크톱에서만) */}
            {!isMobile && history && history.length > 0 && (
              <ScoreChart scores={history} width={panelWidth - 48} />
            )}

            {/* AI 분석 */}
            <RAGAnalysis owner={repoOwner} repo={repoName} />

            {/* GitHub 링크 */}
            <a
              href={repo.htmlUrl ?? `https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-[11px] font-mono text-white/50 hover:text-white/80 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              GitHub에서 보기
            </a>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-mono">
            별을 {isMobile ? '탭' : '클릭'}하세요
          </div>
        )}
      </div>
    </div>
  )
}
