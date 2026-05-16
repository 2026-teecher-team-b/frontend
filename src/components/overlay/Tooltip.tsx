/**
 * Tooltip.tsx — 별 hover 미리보기 툴팁
 */
import { useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { formatCount } from '@/utils/format'
import { getLanguageColor } from '@/utils/physics'

function trendLabel(delta: number) {
  if (delta > 15) return { text: '🔥 급등',  cls: 'text-orange-400' }
  if (delta > 5)  return { text: '↑ 상승',   cls: 'text-green-400' }
  if (delta < -5) return { text: '↓ 하락',   cls: 'text-red-400' }
  return             { text: '→ 안정',   cls: 'text-gray-400' }
}

export default function Tooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const posRef     = useRef({ x: 0, y: 0 })
  const visibleRef = useRef(false)
  const rafRef     = useRef<number>(0)

  const hoveredRepoId = useUIStore((s) => s.hoveredRepoId)
  const repositories  = useGalaxyStore((s) => s.repositories)
  const scores        = useGalaxyStore((s) => s.scores)

  useEffect(() => {
    const onMove = (e: MouseEvent) => { posRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const syncPosition = useCallback(() => {
    if (tooltipRef.current && visibleRef.current) {
      const { x, y } = posRef.current
      const offsetX = x + 200 > window.innerWidth  ? -210 : 16
      const offsetY = y + 140 > window.innerHeight ? -140 : 12
      tooltipRef.current.style.transform = `translate(${x + offsetX}px,${y + offsetY}px)`
    }
    rafRef.current = requestAnimationFrame(syncPosition)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(syncPosition)
    return () => cancelAnimationFrame(rafRef.current)
  }, [syncPosition])

  useEffect(() => {
    visibleRef.current = hoveredRepoId !== null
    if (tooltipRef.current)
      tooltipRef.current.style.opacity = hoveredRepoId !== null ? '1' : '0'
  }, [hoveredRepoId])

  const repo      = hoveredRepoId ? repositories.find((r) => r.id === hoveredRepoId) : null
  const score     = hoveredRepoId ? scores[hoveredRepoId] : undefined
  const langColor = getLanguageColor(repo?.language ?? null)
  const trend     = score ? trendLabel(score.trendDelta) : null

  return (
    <div
      ref={tooltipRef}
      className="fixed top-0 left-0 z-50 pointer-events-none"
      style={{ opacity: 0, transition: 'opacity 0.12s ease', willChange: 'transform' }}
    >
      {repo && (
        <div className="bg-black/90 border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm min-w-[160px]">
          <p className="text-white text-sm font-mono font-semibold truncate max-w-[200px]">{repo.name}</p>
          <p className="text-white/40 text-[10px] font-mono truncate max-w-[200px]">{repo.fullName}</p>
          {repo.language && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
              <span className="text-[11px] text-white/70 font-mono">{repo.language}</span>
            </div>
          )}
          {score && (
            <div className="mt-2 flex gap-3">
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-mono">활동</p>
                <p className="text-xs text-blue-300 font-mono font-bold">{score.activityScore}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-mono">건강</p>
                <p className={`text-xs font-mono font-bold ${score.healthScore < 10 ? 'text-red-400' : score.healthScore < 40 ? 'text-orange-400' : 'text-green-400'}`}>
                  {score.healthScore}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-white/40 font-mono">Stars</p>
                <p className="text-xs text-yellow-300 font-mono font-bold">
                  {repo.starCount != null ? formatCount(repo.starCount) : '—'}
                </p>
              </div>
            </div>
          )}
          {trend && <p className={`text-[10px] font-mono mt-1.5 ${trend.cls}`}>{trend.text}</p>}
          {score && score.healthScore < 10 && (
            <p className="text-[10px] text-red-400 font-mono mt-1 animate-pulse">⚠ 블랙홀 전환 중</p>
          )}
        </div>
      )}
    </div>
  )
}
