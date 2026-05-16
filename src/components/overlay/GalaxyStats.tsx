/**
 * GalaxyStats.tsx — 은하 통계 위젯 (좌하단, 범례 위)
 *
 * 실시간으로 표시:
 *  - 전체 레포 수
 *  - 활성 레포 수 (activityScore ≥ 20)
 *  - 블랙홀 레포 수
 *  - 추적 언어 수
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

    return {
      total:      repositories.length,
      active,
      blackholes,
      languages:  langs.size,
    }
  }, [repositories, scores])

  if (stats.total === 0) return null

  return (
    <div className="absolute bottom-6 right-4 z-20 font-mono select-none text-right">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-end gap-1.5 text-white/40 hover:text-white/70 transition-colors mb-1.5"
      >
        <span className="text-[10px]">{open ? '▼' : '▶'}</span>
        <span className="text-[9px] uppercase tracking-widest">Galaxy Stats</span>
      </button>

      {open && (
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/8 shadow-2xl w-40">
          {[
            { label: '전체 레포',  value: stats.total,      color: 'text-white/60' },
            { label: '활성 별',    value: stats.active,     color: 'text-green-400/80' },
            { label: '블랙홀',     value: stats.blackholes, color: 'text-red-400/80' },
            { label: '언어 종류',  value: stats.languages,  color: 'text-blue-400/80' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center py-0.5">
              <span className="text-[9px] text-white/35">{label}</span>
              <span className={`text-[10px] font-bold tabular-nums ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
