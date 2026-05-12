/**
 * FavoriteLoginModal.tsx — 비로그인 즐겨찾기 클릭 시 로그인 안내
 *
 * "⭐ 즐겨찾기는 로그인 후 사용할 수 있습니다"
 * [GitHub으로 로그인] [취소]
 */
import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'

const OAUTH_URL = import.meta.env.DEV
  ? 'http://localhost:8080/oauth2/authorization/github'
  : '/oauth2/authorization/github'

export default function FavoriteLoginModal() {
  const { isFavoriteLoginModalOpen, closeFavoriteLoginModal } = useUIStore()

  useEffect(() => {
    if (!isFavoriteLoginModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFavoriteLoginModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFavoriteLoginModalOpen, closeFavoriteLoginModal])

  if (!isFavoriteLoginModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={closeFavoriteLoginModal}
    >
      <div
        className="
          w-80 bg-black/90 backdrop-blur-2xl
          border border-white/12 rounded-2xl shadow-2xl
          p-6 text-center
        "
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeScale 0.15s ease-out' }}
      >
        {/* 아이콘 */}
        <div className="text-3xl mb-3">⭐</div>

        {/* 제목 */}
        <h3 className="text-white font-mono font-bold text-sm mb-1.5">
          로그인이 필요합니다
        </h3>
        <p className="text-white/40 font-mono text-[11px] mb-5 leading-relaxed">
          즐겨찾기 기능은 로그인 후 사용할 수 있습니다.
          <br />
          GitHub으로 로그인하시겠습니까?
        </p>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={closeFavoriteLoginModal}
            className="
              flex-1 py-2.5
              bg-white/5 hover:bg-white/10
              border border-white/10 hover:border-white/20
              rounded-xl text-[11px] font-mono text-white/50 hover:text-white/80
              transition-all
            "
          >
            취소
          </button>
          <a
            href={OAUTH_URL}
            className="
              flex-1 py-2.5
              bg-blue-500/20 hover:bg-blue-500/30
              border border-blue-400/30 hover:border-blue-400/50
              rounded-xl text-[11px] font-mono text-blue-300 hover:text-blue-200
              transition-all flex items-center justify-center gap-1.5
            "
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub 로그인
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
