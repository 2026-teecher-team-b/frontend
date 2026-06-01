/**
 * GalaxyStats.tsx — 은하 통계 (HUD)
 *
 * 위치: 우하단, HelpOverlay / ViewToggle 위 (bottom-16)
 */
import { useMemo, useState } from 'react'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { BLACKHOLE_HEALTH_THRESHOLD } from '@/utils/physics'

export default function GalaxyStats() {
  const [open, setOpen] = useState(false)
  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)

  const stats = useMemo(() => {
    let active = 0, blackholes = 0
    const langs = new Set<string>()
    repositories.forEach((repo) => {
      const score = scores[repo.id]
      if (!score) return
      if (score.activityScore >= 20) active++
      if (score.healthScore < BLACKHOLE_HEALTH_THRESHOLD) blackholes++
      if (repo.language) langs.add(repo.language)
    })
    return { total: repositories.length, active, blackholes, languages: langs.size }
  }, [repositories, scores])

  if (stats.total === 0) return null

  const rows = [
    { label: '전체 저장소', value: stats.total,      color: 'rgba(255,255,255,0.55)' },
    { label: '활성 별',    value: stats.active,     color: '#00ff88' },
    { label: '블랙홀',     value: stats.blackholes, color: '#ff3e3e' },
    { label: '언어 수',    value: stats.languages,  color: '#00d4ff' },
  ]

  return (
    /* bottom-16 = 4rem: HelpOverlay(bottom-6) 위에 배치해 겹침 방지 */
    <div className="absolute bottom-16 right-4 z-20 select-none text-right">
      {/* ── Toggle header ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-end gap-1.5 mb-1.5 transition-colors"
        style={{ color: 'rgba(0,212,255,0.38)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.72)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.38)')}
      >
        <span className="text-[8px] tracking-[0.22em] uppercase">은하 통계</span>
        <span className="text-[9px]">{open ? '▾' : '◂'}</span>
      </button>

      {open && (
        <div
          className="relative px-3 py-2.5 w-44"
          style={{
            background:     'rgba(0,10,24,0.90)',
            border:         '1px solid rgba(0,212,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />

          <ul className="space-y-1.5">
            {rows.map(({ label, value, color }) => (
              <li key={label} className="flex justify-between items-center">
                <span className="text-[9px] tracking-wide" style={{ color: 'rgba(0,212,255,0.40)' }}>
                  {label}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color, fontVariantNumeric: 'tabular-nums' }}
                >
                  {value.toString().padStart(3, ' ')}
                </span>
              </li>
            ))}
          </ul>

          {/* Divider + health bar */}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] tracking-wide" style={{ color: 'rgba(0,212,255,0.30)' }}>상태</span>
              <span className="text-[8px]" style={{ color: 'rgba(0,212,255,0.35)' }}>
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-0.5 w-full" style={{ background: 'rgba(0,212,255,0.10)' }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  width:      `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%`,
                  background: `linear-gradient(90deg, #00d4ff, #00ff88)`,
                  boxShadow:  '0 0 8px rgba(0,212,255,0.5)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
