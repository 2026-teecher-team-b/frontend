/**
 * Legend.tsx — 언어별 색상 범례
 *
 * 화면 하단 좌측에 고정 배치.
 * 현재 씬에 존재하는 언어만 표시 (없는 언어는 숨김).
 * 토글 버튼으로 접기/펼치기 가능.
 */

import { useState } from 'react'
import { useGalaxyStore } from '@/store/useGalaxyStore'

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4f8ef7', JavaScript: '#f7d44f', Python:    '#4da8e0',
  Go:         '#00d4c8', Rust:       '#f07050', Java:      '#e8a24a',
  'C++':      '#e05080', Ruby:       '#d94040', Swift:     '#f05c30',
  Kotlin:     '#b06cff', PHP:        '#9090e0', 'C#':      '#68c060',
  Scala:      '#d04040', Haskell:    '#9060c8',
}

export default function Legend() {
  const [collapsed, setCollapsed] = useState(false)
  const stars = useGalaxyStore((s) => s.stars)

  // 씬에 존재하는 언어만 추출 (순서 유지)
  const languages = Array.from(
    new Set(stars.map((s) => s.language).filter(Boolean) as string[])
  )

  if (languages.length === 0) return null

  return (
    <div className="absolute bottom-6 left-4 z-20 font-mono text-[11px] select-none">
      {/* 헤더 */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors mb-1.5"
        aria-label={collapsed ? '범례 펼치기' : '범례 접기'}
      >
        <span className="text-[10px]">{collapsed ? '▶' : '▼'}</span>
        <span className="tracking-widest uppercase text-[9px]">Legend</span>
      </button>

      {/* 언어 목록 */}
      {!collapsed && (
        <ul className="space-y-1.5 bg-black/30 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-white/5">
          {languages.map((lang) => (
            <li key={lang} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: LANGUAGE_COLORS[lang] ?? '#aabbcc', boxShadow: `0 0 4px ${LANGUAGE_COLORS[lang] ?? '#aabbcc'}80` }}
              />
              <span className="text-white/60 text-[10px]">{lang}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
