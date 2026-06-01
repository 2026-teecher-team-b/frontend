/**
 * HelpOverlay.tsx — 카메라 조작 가이드 (HUD)
 */
import { useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

const DESKTOP_CONTROLS = [
  { key: '좌클릭 드래그',  desc: '360° 회전' },
  { key: '우클릭 드래그',  desc: '화면 이동' },
  { key: '스크롤',         desc: '줌인 / 줌아웃' },
  { key: '별 클릭',        desc: '정보 패널 열기' },
  { key: '빈 곳 클릭',     desc: '패널 닫기' },
  { key: 'ESC',            desc: '패널 닫기' },
  { key: '/ 또는 ⌘K',     desc: '저장소 검색' },
]

const MOBILE_CONTROLS = [
  { key: '손가락 1개',   desc: '360° 회전' },
  { key: '손가락 2개',   desc: '화면 이동' },
  { key: '핀치',         desc: '줌인 / 줌아웃' },
  { key: '별 탭',        desc: '정보 패널 열기' },
  { key: '빈 곳 탭',     desc: '패널 닫기' },
]

export default function HelpOverlay() {
  const [visible, setVisible] = useState(false)
  const isMobile  = useIsMobile()
  const controls  = isMobile ? MOBILE_CONTROLS : DESKTOP_CONTROLS

  return (
    <div className="absolute bottom-6 right-4 z-20 select-none flex flex-col items-end">
      {visible && (
        <div
          className="relative mb-2 w-52"
          style={{
            background:     'rgba(0,10,24,0.92)',
            border:         '1px solid rgba(0,212,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.50)' }} />

          {/* Header */}
          <div
            className="px-3 py-2"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.10)' }}
          >
            <p className="text-[8px] tracking-[0.18em] uppercase" style={{ color: 'rgba(0,212,255,0.45)' }}>
              ▶ 조작 가이드
            </p>
          </div>

          {/* Controls list */}
          <ul className="px-3 py-2 space-y-1.5">
            {controls.map(({ key, desc }) => (
              <li key={key} className="flex justify-between items-center gap-3">
                <span
                  className="text-[9px] px-1.5 py-0.5"
                  style={{
                    color:      '#00d4ff',
                    background: 'rgba(0,212,255,0.06)',
                    border:     '1px solid rgba(0,212,255,0.18)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {key}
                </span>
                <span className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {desc}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setVisible((v) => !v)}
        className="flex items-center justify-center w-7 h-7 transition-all duration-150"
        style={{
          background: visible
            ? 'rgba(0,212,255,0.10)'
            : 'rgba(0,212,255,0.04)',
          border: `1px solid ${visible ? 'rgba(0,212,255,0.45)' : 'rgba(0,212,255,0.18)'}`,
          color:  visible ? '#00d4ff' : 'rgba(0,212,255,0.40)',
          fontSize: 11,
        }}
        onMouseEnter={(e) => {
          if (!visible) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.40)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.75)'
          }
        }}
        onMouseLeave={(e) => {
          if (!visible) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.18)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.40)'
          }
        }}
        title="조작 가이드"
      >
        ?
      </button>
    </div>
  )
}
