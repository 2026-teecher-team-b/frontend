/**
 * Tooltip.tsx — 별 hover 미리보기 툴팁 (HUD 리디자인)
 */
import { useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { formatCount } from '@/utils/format'
import { getLanguageColor } from '@/utils/physics'

function trendLabel(delta: number) {
  if (delta > 15) return { text: '▲▲ 급상승',  color: '#ff8c00' }
  if (delta > 5)  return { text: '▲ 상승',    color: '#00ff88' }
  if (delta < -5) return { text: '▼ 하락',    color: '#ff3e3e' }
  return             { text: '─ 안정',     color: 'rgba(0,212,255,0.45)' }
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
      const offsetX = x + 220 > window.innerWidth  ? -226 : 18
      const offsetY = y + 150 > window.innerHeight ? -148 : 14
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
  const isBlackHole = (score?.healthScore ?? 50) < 2

  return (
    <div
      ref={tooltipRef}
      className="fixed top-0 left-0 z-50 pointer-events-none"
      style={{ opacity: 0, transition: 'opacity 0.10s ease', willChange: 'transform' }}
    >
      {repo && (
        <div
          className="relative min-w-[200px] max-w-[250px]"
          style={{
            background:     'rgba(0,8,20,0.95)',
            border:         '1px solid rgba(0,212,255,0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />

          {/* Repo header */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
            <p className="text-[14px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>
              {repo.name}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(0,212,255,0.42)' }}>
              {repo.fullName}
            </p>
          </div>

          {/* Language */}
          {repo.language && (
            <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: langColor, boxShadow: `0 0 5px ${langColor}` }}
              />
              <span className="text-[11px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.58)' }}>
                {repo.language}
              </span>
              {isBlackHole && (
                <span className="text-[10px] tracking-widest ml-auto" style={{ color: '#ff3e3e' }}>
                  ⬤ 블랙홀
                </span>
              )}
            </div>
          )}

          {/* Metrics */}
          {score && (
            <div
              className="px-3 py-2 grid grid-cols-3 gap-2"
              style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
            >
              {[
                { label: '활성',   value: score.activityScore, color: '#00d4ff' },
                { label: '건강',   value: score.healthScore,
                  color: score.healthScore < 10 ? '#ff3e3e' : score.healthScore < 40 ? '#ffaa00' : '#00ff88' },
                { label: '★',     value: repo.starCount != null ? formatCount(repo.starCount) : '—',
                  color: '#ffc23a' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: 'rgba(0,212,255,0.30)' }}>
                    {label}
                  </p>
                  <p className="text-[14px] font-bold tabular-nums" style={{ color }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Trend */}
          {trend && (
            <div
              className="px-3 py-1.5 flex items-center"
              style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
            >
              <span className="text-[11px] tracking-widest uppercase" style={{ color: trend.color }}>
                {trend.text}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
