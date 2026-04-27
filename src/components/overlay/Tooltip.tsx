/**
 * Tooltip.tsx — 별 마우스오버 시 나타나는 2D 툴팁
 *
 * 동작:
 *  - useUIStore.hoveredRepoId를 구독
 *  - 전역 mousemove 이벤트로 커서 위치 추적 (ref 사용 → 리렌더 없음)
 *  - hoveredRepoId 변경 시만 React 리렌더
 *
 * 표시 내용:
 *  - 저장소 이름, 언어 (색상 닷), 활동 점수, 건강 점수, 트렌드
 */

import { useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { formatCount } from '@/utils/format'

// ── 언어별 색상 (Star.tsx와 동기화) ─────────────────────────────────
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4f8ef7', JavaScript: '#f7d44f', Python: '#4da8e0',
  Go: '#00d4c8',  Rust: '#f07050',   Java: '#e8a24a',
  'C++': '#e05080', Ruby: '#d94040', Swift: '#f05c30',
  Kotlin: '#b06cff', PHP: '#9090e0', 'C#': '#68c060',
}
const DEFAULT_COLOR = '#aabbcc'

function trendLabel(delta: number) {
  if (delta > 15) return { text: '🔥 급등', cls: 'text-orange-400' }
  if (delta > 5)  return { text: '↑ 상승', cls: 'text-green-400' }
  if (delta < -5) return { text: '↓ 하락', cls: 'text-red-400' }
  return { text: '→ 안정', cls: 'text-gray-400' }
}

// ─────────────────────────────────────────────────────────────────
export default function Tooltip() {
  const tooltipRef  = useRef<HTMLDivElement>(null)
  const posRef      = useRef({ x: 0, y: 0 })
  const visibleRef  = useRef(false)
  const rafRef      = useRef<number>(0)

  const hoveredRepoId = useUIStore((s) => s.hoveredRepoId)
  const repositories  = useGalaxyStore((s) => s.repositories)
  const scores        = useGalaxyStore((s) => s.scores)

  // ── 글로벌 마우스 트래킹 (ref 기반 → 리렌더 없음) ────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── rAF 루프로 툴팁 위치 업데이트 ────────────────────────────────
  const syncPosition = useCallback(() => {
    if (tooltipRef.current && visibleRef.current) {
      const { x, y } = posRef.current
      const el = tooltipRef.current
      // 화면 오른쪽·아래 넘침 방지
      const offsetX = x + 180 > window.innerWidth  ? -180 : 16
      const offsetY = y + 120 > window.innerHeight ? -120 : 12
      el.style.transform = `translate(${x + offsetX}px, ${y + offsetY}px)`
    }
    rafRef.current = requestAnimationFrame(syncPosition)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(syncPosition)
    return () => cancelAnimationFrame(rafRef.current)
  }, [syncPosition])

  // ── hoveredRepoId 변경 시 visibility 토글 ────────────────────────
  useEffect(() => {
    visibleRef.current = hoveredRepoId !== null
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = hoveredRepoId !== null ? '1' : '0'
      tooltipRef.current.style.pointerEvents = 'none'
    }
  }, [hoveredRepoId])

  // ── 데이터 조회 ──────────────────────────────────────────────────
  const repo  = hoveredRepoId ? repositories.find((r) => r.id === hoveredRepoId) : null
  const score = hoveredRepoId ? scores[hoveredRepoId] : undefined
  const langColor = repo?.language ? (LANGUAGE_COLORS[repo.language] ?? DEFAULT_COLOR) : DEFAULT_COLOR
  const trend = score ? trendLabel(score.trendDelta) : null

  return (
    <div
      ref={tooltipRef}
      className="fixed top-0 left-0 z-50 pointer-events-none"
      style={{ opacity: 0, transition: 'opacity 0.12s ease', willChange: 'transform' }}
    >
      {repo && (
        <div className="bg-space-900/95 border border-white/10 rounded-lg px-3 py-2.5 shadow-2xl backdrop-blur-sm min-w-[160px]">
          {/* 이름 */}
          <p className="text-white text-sm font-mono font-semibold leading-tight truncate max-w-[200px]">
            {repo.name}
          </p>
          <p className="text-white/40 text-[10px] font-mono truncate max-w-[200px]">
            {repo.fullName}
          </p>

          {/* 언어 */}
          {repo.language && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: langColor }}
              />
              <span className="text-[11px] text-white/70 font-mono">{repo.language}</span>
            </div>
          )}

          {/* 점수 */}
          {score && (
            <div className="mt-2 flex gap-3">
              <div className="text-center">
                <p className="text-[10px] text-white/40 font-mono">활동</p>
                <p className="text-xs text-blue-300 font-mono font-bold">{score.activityScore}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/40 font-mono">건강</p>
                <p
                  className={`text-xs font-mono font-bold ${score.healthScore < 10 ? 'text-red-400' : score.healthScore < 40 ? 'text-orange-400' : 'text-green-400'}`}
                >
                  {score.healthScore}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/40 font-mono">Stars</p>
                <p className="text-xs text-yellow-300 font-mono font-bold">{formatCount(repo.starCount)}</p>
              </div>
            </div>
          )}

          {/* 트렌드 */}
          {trend && (
            <p className={`text-[10px] font-mono mt-1.5 ${trend.cls}`}>{trend.text}</p>
          )}

          {/* 블랙홀 경고 */}
          {score && score.healthScore < 10 && (
            <p className="text-[10px] text-red-400 font-mono mt-1 animate-pulse">
              ⚠ 블랙홀 전환 중
            </p>
          )}
        </div>
      )}
    </div>
  )
}
