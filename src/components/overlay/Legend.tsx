/**
 * Legend.tsx — 언어별 색상 범례 + 필터 토글
 *
 * - 언어 클릭 → 해당 언어 별만 표시 (다시 클릭 = 해제)
 * - 여러 언어 동시 선택 가능
 * - "전체 보기" 버튼으로 필터 초기화
 * - 선택된 언어 강조, 비선택 언어 흐리게
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

  // 씬에 존재하는 언어 + 해당 별 수 집계 (language=null 제외)
  const langCounts = new Map<string, number>()
  stars.forEach((s) => {
    if (!s.language) return  // null/undefined → 범례에서 숨김
    langCounts.set(s.language, (langCounts.get(s.language) ?? 0) + 1)
  })
  const languages = Array.from(langCounts.entries()).sort((a, b) => b[1] - a[1])

  if (languages.length === 0) return null

  const isFiltering = langFilter.length > 0

  return (
    <div className="absolute bottom-6 left-4 z-20 font-mono select-none max-w-[180px]">
      {/* 헤더 */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors mb-1.5"
      >
        <span className="text-[10px]">{collapsed ? '▶' : '▼'}</span>
        <span className="tracking-widest uppercase text-[9px]">Languages</span>
        {isFiltering && (
          <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1 py-0.5 rounded ml-1">
            {langFilter.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-2.5 py-2.5 border border-white/8 shadow-2xl">
          {/* 전체 보기 버튼 */}
          {isFiltering && (
            <button
              onClick={clearLangFilter}
              className="w-full text-left text-[9px] text-blue-300/80 hover:text-blue-200 mb-2 pb-2 border-b border-white/8 transition-colors flex items-center gap-1"
            >
              <span>✕</span>
              <span>전체 보기</span>
            </button>
          )}

          {/* 언어 목록 */}
          <ul className="space-y-1">
            {languages.map(([lang, count]) => {
              const color   = getLanguageColor(lang)
              const active  = langFilter.includes(lang)
              const dimmed  = isFiltering && !active

              return (
                <li key={lang}>
                  <button
                    onClick={() => toggleLangFilter(lang)}
                    className={`
                      w-full flex items-center gap-2 rounded-md px-1.5 py-1
                      transition-all duration-150 text-left
                      ${active
                        ? 'bg-white/10 ring-1 ring-white/20'
                        : 'hover:bg-white/5'
                      }
                      ${dimmed ? 'opacity-30' : 'opacity-100'}
                    `}
                    title={`${lang} (${count}개)`}
                  >
                    {/* 색상 닷 */}
                    <span
                      className="flex-shrink-0 rounded-full transition-all"
                      style={{
                        width:     active ? 9 : 7,
                        height:    active ? 9 : 7,
                        backgroundColor: color,
                        boxShadow: active
                          ? `0 0 8px ${color}, 0 0 16px ${color}60`
                          : `0 0 4px ${color}60`,
                      }}
                    />
                    {/* 언어명 */}
                    <span
                      className={`text-[10px] transition-colors truncate flex-1 ${
                        active ? 'text-white' : 'text-white/60'
                      }`}
                    >
                      {lang}
                    </span>
                    {/* 별 수 */}
                    <span className="text-[9px] text-white/25 flex-shrink-0">
                      {count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 안내 텍스트 */}
          <p className="text-[8.5px] text-white/20 mt-2 pt-2 border-t border-white/8 leading-tight">
            {isFiltering ? '클릭해서 추가·해제' : '클릭해서 필터링'}
          </p>
        </div>
      )}
    </div>
  )
}
