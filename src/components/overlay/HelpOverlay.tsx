/**
 * HelpOverlay.tsx — 카메라 조작 가이드 (우하단 토글)
 */
import { useState } from 'react'

const CONTROLS = [
  { key: '좌클릭 드래그', desc: '360° 회전' },
  { key: '우클릭 드래그', desc: '시점 이동 (팬)' },
  { key: '스크롤',        desc: '줌인 / 줌아웃' },
  { key: '별 클릭',       desc: '상세 정보 + 추적' },
  { key: '빈 화면 클릭',  desc: '패널 닫기 / 복귀' },
  { key: 'ESC',           desc: '패널 닫기' },
  { key: '/ 또는 ⌘K',   desc: '검색 포커스' },
]

export default function HelpOverlay() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-6 right-4 z-20 font-mono text-[10px] select-none">
      {open && (
        <div className="mb-2 bg-black/60 backdrop-blur-md border border-white/8 rounded-xl px-3 py-2.5 shadow-xl w-52">
          <p className="text-white/40 text-[9px] uppercase tracking-widest mb-2">카메라 조작</p>
          <ul className="space-y-1.5">
            {CONTROLS.map(({ key, desc }) => (
              <li key={key} className="flex justify-between gap-3">
                <span className="text-white/50 truncate">{key}</span>
                <span className="text-white/30 text-right">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex items-center justify-center w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white/40 hover:text-white/70 transition-all"
        title="조작 도움말"
      >
        ?
      </button>
    </div>
  )
}
