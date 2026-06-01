/**
 * Legend.tsx — 언어별 색상 범례 + 필터 토글 (HUD 리디자인)
 */
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { useState } from 'react'
import { getLanguageColor } from '@/utils/physics'

export default function Legend() {
  const [collapsed, setCollapsed] = useState(false)

  const stars      = useGalaxyStore((s) => s.stars)
  const langFilter = useUIStore((s) => s.langFilter)
  const toggleLangFilter = useUIStore((s) => s.toggleLangFilter)
  const clearLangFilter  = useUIStore((s) => s.clearLangFilter)

  const langCounts = new Map<string, number>()
  stars.forEach((s) => {
    if (!s.language) return
    langCounts.set(s.language, (langCounts.get(s.language) ?? 0) + 1)
  })
  const languages = Array.from(langCounts.entries()).sort((a, b) => b[1] - a[1])

  if (languages.length === 0) return null

  const isFiltering = langFilter.length > 0

  return (
    <div className="absolute bottom-6 left-4 z-20 select-none" style={{ maxWidth: 180 }}>
      {/* ── Header toggle ─────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 mb-1.5 transition-colors"
        style={{ color: 'rgba(0,212,255,0.40)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.75)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.40)')}
      >
        <span className="text-[9px]">{collapsed ? '▸' : '▾'}</span>
        <span className="text-[8px] tracking-[0.18em]">▤ 언어 필터</span>
        {isFiltering && (
          <span
            className="text-[8px] px-1 py-0.5 ml-0.5 tracking-widest"
            style={{
              color:      '#00d4ff',
              background: 'rgba(0,212,255,0.12)',
              border:     '1px solid rgba(0,212,255,0.30)',
            }}
          >
            {langFilter.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div
          className="relative px-2.5 py-2.5"
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

          {/* Clear filter */}
          {isFiltering && (
            <button
              onClick={clearLangFilter}
              className="w-full text-left text-[8px] mb-2 pb-2 flex items-center gap-1 transition-colors tracking-widest uppercase"
              style={{
                color:        'rgba(0,212,255,0.55)',
                borderBottom: '1px solid rgba(0,212,255,0.10)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.90)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.55)')}
            >
              <span>✕</span>
              <span>필터 초기화</span>
            </button>
          )}

          {/* Language list */}
          <ul className="space-y-0.5">
            {languages.map(([lang, count]) => {
              const color  = getLanguageColor(lang)
              const active = langFilter.includes(lang)
              const dimmed = isFiltering && !active

              return (
                <li key={lang}>
                  <button
                    onClick={() => toggleLangFilter(lang)}
                    className="w-full flex items-center gap-2 px-1.5 py-1 text-left transition-all duration-100"
                    style={{
                      opacity:    dimmed ? 0.28 : 1,
                      background: active ? 'rgba(0,212,255,0.06)' : 'transparent',
                      border:     active
                        ? '1px solid rgba(0,212,255,0.20)'
                        : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                    title={`${lang} (${count})`}
                  >
                    {/* Color dot */}
                    <span
                      className="flex-shrink-0 rounded-full transition-all"
                      style={{
                        width:           active ? 8 : 6,
                        height:          active ? 8 : 6,
                        backgroundColor: color,
                        boxShadow:       active
                          ? `0 0 8px ${color}, 0 0 16px ${color}55`
                          : `0 0 4px ${color}55`,
                      }}
                    />
                    {/* Language name */}
                    <span
                      className="text-[10px] truncate flex-1"
                      style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.52)' }}
                    >
                      {lang}
                    </span>
                    {/* Count */}
                    <span className="text-[8px] flex-shrink-0" style={{ color: 'rgba(0,212,255,0.25)' }}>
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Footer hint */}
          <p
            className="text-[8px] mt-2 pt-2 tracking-widest uppercase"
            style={{
              color:     'rgba(0,212,255,0.20)',
              borderTop: '1px solid rgba(0,212,255,0.08)',
            }}
          >
            {isFiltering ? '// 다중 선택 중' : '// 클릭으로 필터'}
          </p>
        </div>
      )}
    </div>
  )
}
