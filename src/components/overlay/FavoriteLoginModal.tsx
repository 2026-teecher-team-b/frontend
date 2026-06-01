/**
 * FavoriteLoginModal.tsx — 비로그인 즐겨찾기 클릭 시 로그인 안내 (HUD 리디자인)
 */
import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'

const API_BASE  = import.meta.env.VITE_API_BASE_URL ?? ''
const OAUTH_URL = import.meta.env.DEV
  ? '/oauth2/authorization/github'
  : `${API_BASE}/oauth2/authorization/github`

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,4,12,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={closeFavoriteLoginModal}
    >
      <div
        className="relative w-80 p-6 text-center"
        style={{
          background:     'rgba(0,8,22,0.97)',
          border:         '1px solid rgba(0,212,255,0.20)',
          backdropFilter: 'blur(20px)',
          animation:      'fadeScale 0.14s ease-out',
          boxShadow:      '0 0 40px rgba(0,212,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />

        {/* Icon */}
        <div className="text-2xl mb-3" style={{ color: 'rgba(0,212,255,0.30)' }}>◈</div>

        {/* Title */}
        <p
          className="text-[8px] tracking-[0.25em] uppercase mb-1"
          style={{ color: 'rgba(0,212,255,0.38)' }}
        >
          ▸ 로그인 필요
        </p>
        <h3
          className="text-sm font-bold mb-2"
          style={{ color: 'rgba(255,255,255,0.88)' }}
        >
          즐겨찾기 로그인
        </h3>
        <p
          className="text-[10px] mb-5 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.38)' }}
        >
          즐겨찾기 기능은 GitHub 로그인이 필요해요.
          <br />계정을 연결하고 별을 추적하세요.
        </p>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={closeFavoriteLoginModal}
            className="flex-1 py-2.5 text-[9px] tracking-[0.18em] uppercase transition-all"
            style={{
              color:      'rgba(0,212,255,0.40)',
              background: 'rgba(0,212,255,0.03)',
              border:     '1px solid rgba(0,212,255,0.12)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.75)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.35)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.40)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.12)'
            }}
          >
            취소
          </button>
          <a
            href={OAUTH_URL}
            className="flex-1 py-2.5 text-[9px] tracking-[0.18em] uppercase transition-all flex items-center justify-center gap-1.5"
            style={{
              color:      '#00d4ff',
              background: 'rgba(0,212,255,0.06)',
              border:     '1px solid rgba(0,212,255,0.30)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.12)'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.55)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,212,255,0.06)'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.30)'
            }}
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
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
