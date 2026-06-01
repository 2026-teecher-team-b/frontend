/**
 * ViewToggle.tsx — 2D / 3D 뷰 전환 버튼 (HUD 스타일)
 *
 * 위치: 우하단, HelpOverlay(?) 왼쪽
 *  - 3D: 기본 궤도 카메라 (자유 회전)
 *  - 2D: 위에서 아래로 내려다보는 평면도 (Φ=90°)
 */
import { useUIStore } from '@/store/useUIStore'

export default function ViewToggle() {
  const viewMode   = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)

  return (
    <div
      className="absolute bottom-6 z-20 flex select-none"
      style={{ right: '3.25rem' }}   // ? 버튼(28px) + 4px 갭 + 4px margin-right = 약 52px
    >
      {(['3d', '2d'] as const).map((mode, i) => {
        const active = viewMode === mode
        return (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="flex items-center justify-center transition-all duration-150"
            style={{
              width:       32,
              height:      28,
              fontSize:    9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: active ? '#00d4ff' : 'rgba(0,212,255,0.38)',
              background: active
                ? 'rgba(0,212,255,0.10)'
                : 'rgba(0,212,255,0.03)',
              border: `1px solid ${active ? 'rgba(0,212,255,0.45)' : 'rgba(0,212,255,0.15)'}`,
              borderRight: i === 0 ? 'none' : undefined,
              boxShadow: active ? '0 0 8px rgba(0,212,255,0.15)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.70)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.30)'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.38)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.15)'
              }
            }}
            title={mode === '3d' ? '3D 회전 뷰' : '2D 평면도'}
          >
            {mode.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
