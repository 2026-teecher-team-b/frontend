/**
 * ToastNotification.tsx — 토스트 알림 (HUD 리디자인)
 */
import { useUIStore } from '@/store/useUIStore'

export default function ToastNotification() {
  const toastMessage = useUIStore((s) => s.toastMessage)

  if (!toastMessage) return null

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 pointer-events-none text-[10px] tracking-widest uppercase"
        style={{
          background:     'rgba(0,8,20,0.96)',
          border:         '1px solid rgba(0,212,255,0.32)',
          color:          '#00d4ff',
          backdropFilter: 'blur(12px)',
          animation:      'toastIn 0.18s ease-out',
          boxShadow:      '0 0 20px rgba(0,212,255,0.08)',
        }}
      >
        <span style={{ color: 'rgba(0,212,255,0.50)' }}>▸ </span>
        {toastMessage}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  )
}
