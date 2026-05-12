/**
 * ToastNotification.tsx — 하단 중앙 토스트 알림
 *
 * useUIStore.toastMessage가 세팅되면 표시, null이 되면 사라짐.
 * App.tsx에서 데이터 갱신 시 showToast() 호출.
 */
import { useUIStore } from '@/store/useUIStore'

export default function ToastNotification() {
  const toastMessage = useUIStore((s) => s.toastMessage)

  if (!toastMessage) return null

  return (
    <div
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-4 py-2.5
        bg-black/80 backdrop-blur-xl
        border border-white/15 rounded-xl shadow-2xl
        text-[11px] font-mono text-white/70
        pointer-events-none
      "
      style={{ animation: 'toastIn 0.2s ease-out' }}
    >
      {toastMessage}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
