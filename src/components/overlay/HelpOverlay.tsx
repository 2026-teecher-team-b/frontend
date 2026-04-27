/**
 * HelpOverlay.tsx — 도움말 오버레이
 *
 * 화면 우하단의 ? 버튼으로 토글.
 * 카메라 조작 방법 및 별 인터랙션 설명.
 */

import { useState } from 'react'

interface HelpItem {
  icon: string
  action: string
  desc: string
}

const HELP_ITEMS: HelpItem[] = [
  { icon: '🖱️', action: '드래그',       desc: '우주 공간 이동' },
  { icon: '⚙️', action: '스크롤',       desc: '줌인 / 줌아웃' },
  { icon: '👆', action: '별 클릭',     desc: '상세 정보 패널 열기' },
  { icon: '✨', action: '별 호버',     desc: '저장소 미리보기' },
  { icon: '🌌', action: '각 성단',     desc: '같은 언어의 별 모음' },
  { icon: '🕳️', action: '검은 별',    desc: '건강 지수 위험 (블랙홀)' },
  { icon: '☄️', action: '유성',        desc: '실시간 저장소 이벤트' },
]

export default function HelpOverlay() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-6 right-4 z-20 font-mono select-none">
      {/* 도움말 패널 */}
      {open && (
        <div className="mb-2 bg-space-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm w-56 text-[11px]">
          <p className="text-white/50 uppercase tracking-widest text-[9px] mb-3">사용 방법</p>
          <ul className="space-y-2">
            {HELP_ITEMS.map(({ icon, action, desc }) => (
              <li key={action} className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5">{icon}</span>
                <div>
                  <span className="text-white/80 font-semibold">{action}</span>
                  <span className="text-white/40"> — {desc}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2.5 border-t border-white/5 text-[9px] text-white/25 leading-relaxed">
            GitHub Universe — 오픈소스 생태계 실시간 3D 시각화<br />
            별 크기 = 활동량 · 밝기 = 건강 지수
          </div>
        </div>
      )}

      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          text-sm font-bold border transition-all duration-200 ml-auto
          ${open
            ? 'bg-white/20 border-white/30 text-white'
            : 'bg-black/40 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
          }
        `}
        aria-label="도움말 토글"
      >
        ?
      </button>
    </div>
  )
}
