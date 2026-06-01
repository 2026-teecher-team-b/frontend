/**
 * ProfileModal.tsx — GitHub 프로필 + 즐겨찾기 모달 (HUD 리디자인)
 */
import { useEffect } from 'react'
import { useUIStore } from '@/store/useUIStore'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { getLanguageColor } from '@/utils/physics'
import { apiClient } from '@/api/axios'

export default function ProfileModal() {
  const {
    isProfileModalOpen, closeProfileModal,
    user, setUser, favorites, toggleFavorite, selectRepo,
  } = useUIStore()
  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)

  useEffect(() => {
    if (!isProfileModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeProfileModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isProfileModalOpen, closeProfileModal])

  if (!isProfileModalOpen || !user) return null

  const favoriteRepos = repositories.filter((r) => favorites.includes(r.id))

  const handleRepoClick = (repoId: number) => {
    closeProfileModal()
    selectRepo(repoId)
  }

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout') } catch { /* ignore */ }
    setUser(null)
    closeProfileModal()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4"
      onClick={closeProfileModal}
    >
      <div
        className="relative mt-14 w-72 overflow-hidden"
        style={{
          background:     'rgba(0,8,22,0.96)',
          border:         '1px solid rgba(0,212,255,0.18)',
          backdropFilter: 'blur(20px)',
          animation:      'fadeSlideDown 0.16s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t border-l z-10" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
        <span className="absolute top-0 right-0 w-3 h-3 border-t border-r z-10" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l z-10" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r z-10" style={{ borderColor: 'rgba(0,212,255,0.60)' }} />

        {/* ── Header: user info ──────────────────────────────── */}
        <div
          className="flex items-center gap-3 p-4"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.10)' }}
        >
          <img
            src={user.profileUrl || `https://github.com/${user.githubLogin}.png?size=64`}
            alt={user.githubLogin}
            className="w-11 h-11 flex-shrink-0"
            style={{ border: '1px solid rgba(0,212,255,0.28)' }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              {user.githubLogin}
            </p>
            <a
              href={`https://github.com/${user.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-widest transition-colors"
              style={{ color: 'rgba(0,212,255,0.45)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.80)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.45)')}
            >
              github.com/{user.githubLogin} ↗
            </a>
          </div>
          <button
            onClick={closeProfileModal}
            className="w-6 h-6 flex items-center justify-center text-[10px] flex-shrink-0 transition-all"
            style={{
              color:      'rgba(0,212,255,0.40)',
              border:     '1px solid rgba(0,212,255,0.15)',
              background: 'rgba(0,212,255,0.04)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#00d4ff'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.45)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.40)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.15)'
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Favorites section ──────────────────────────────── */}
        <div className="p-3">
          <div
            className="flex items-center justify-between mb-2 pb-1.5"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <p className="text-[8px] tracking-[0.22em] uppercase" style={{ color: 'rgba(0,212,255,0.38)' }}>
              ★ 즐겨찾기 저장소
            </p>
            <span className="text-[8px] tracking-widest" style={{ color: 'rgba(0,212,255,0.28)' }}>
              {favoriteRepos.length}
            </span>
          </div>

          {favoriteRepos.length === 0 ? (
            <div className="py-5 text-center">
              <p className="text-[11px]" style={{ color: 'rgba(0,212,255,0.28)' }}>
                즐겨찾기가 없습니다
              </p>
              <p className="text-[9px] mt-1 tracking-wide" style={{ color: 'rgba(0,212,255,0.15)' }}>
                별 옆의 ★를 클릭해 추가하세요
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5 max-h-60 overflow-y-auto">
              {favoriteRepos.map((repo) => {
                const score      = scores[repo.id]
                const langColor  = getLanguageColor(repo.language)
                const isBlackHole = (score?.healthScore ?? 50) < 2

                return (
                  <li key={repo.id}>
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 transition-all group"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.12)'
                        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.04)'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
                        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isBlackHole ? '#111' : langColor,
                          boxShadow: isBlackHole ? 'none' : `0 0 5px ${langColor}80`,
                        }}
                      />
                      <button
                        onClick={() => handleRepoClick(repo.id)}
                        className="flex-1 text-left text-[11px] truncate transition-colors"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.90)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                      >
                        {repo.name}
                        {isBlackHole && (
                          <span className="ml-1 text-[8px]" style={{ color: '#ff3e3e' }}>⬤</span>
                        )}
                      </button>
                      <button
                        onClick={() => toggleFavorite(repo.id)}
                        className="text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        style={{ color: '#ffc23a' }}
                        title="UNTRACK"
                      >
                        ★
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Footer actions ─────────────────────────────────── */}
        <div
          className="px-3 pb-3 pt-2 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}
        >
          <a
            href={`https://github.com/${user.githubLogin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-center text-[9px] tracking-widest uppercase transition-all"
            style={{
              color:      'rgba(0,212,255,0.45)',
              background: 'rgba(0,212,255,0.04)',
              border:     '1px solid rgba(0,212,255,0.12)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#00d4ff'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.35)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(0,212,255,0.45)'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(0,212,255,0.12)'
            }}
          >
            GitHub 프로필 ↗
          </a>
          <button
            onClick={handleLogout}
            className="flex-1 py-2 text-center text-[9px] tracking-widest uppercase transition-all"
            style={{
              color:      'rgba(255,62,62,0.60)',
              background: 'rgba(255,62,62,0.04)',
              border:     '1px solid rgba(255,62,62,0.12)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ff3e3e'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,62,62,0.35)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,62,62,0.60)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,62,62,0.12)'
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
