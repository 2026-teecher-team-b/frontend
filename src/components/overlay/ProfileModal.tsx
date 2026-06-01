/**
 * ProfileModal.tsx — GitHub 프로필 + 즐겨찾기 모달
 *
 * 열리는 조건: 우상단 아바타 클릭 (로그인 상태)
 *
 * 내용:
 *  - 유저 아바타, GitHub 아이디, GitHub 링크
 *  - 즐겨찾기한 레포 목록 (언어 색상 닷 + 이름 + 해제 버튼)
 *  - 레포 클릭 → 모달 닫고 사이드 패널 열기
 *  - ESC / 배경 클릭으로 닫기
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

  // ESC 닫기
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
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // 세션이 이미 만료됐어도 클라이언트 상태는 초기화
    }
    setUser(null)
    closeProfileModal()
  }

  return (
    /* ── 배경 오버레이 ─────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4"
      onClick={closeProfileModal}
    >
      {/* ── 모달 카드 ────────────────────────────────────────────── */}
      <div
        className="
          mt-14 w-72
          bg-black/85 backdrop-blur-2xl
          border border-white/12 rounded-2xl shadow-2xl
          overflow-hidden
          animate-[fadeSlideDown_0.18s_ease-out]
        "
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeSlideDown 0.18s ease-out' }}
      >
        {/* ── 헤더: 유저 정보 ──────────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 border-b border-white/8">
          <img
            src={user.profileUrl || `https://github.com/${user.githubLogin}.png?size=64`}
            alt={user.githubLogin}
            className="w-12 h-12 rounded-full border-2 border-white/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-mono font-bold text-sm truncate">
              {user.githubLogin}
            </p>
            <a
              href={`https://github.com/${user.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-blue-400/70 hover:text-blue-300 transition-colors"
            >
              github.com/{user.githubLogin} ↗
            </a>
          </div>
          <button
            onClick={closeProfileModal}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/80 text-xs transition-all flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── 즐겨찾기 섹션 ────────────────────────────────────── */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-white/35 font-mono uppercase tracking-widest">
              즐겨찾기한 저장소
            </p>
            <span className="text-[9px] text-white/30 font-mono">
              {favoriteRepos.length}개
            </span>
          </div>

          {favoriteRepos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[11px] text-white/25 font-mono">
                즐겨찾기한 저장소가 없습니다
              </p>
              <p className="text-[9px] text-white/15 font-mono mt-1">
                별을 클릭하고 ★를 눌러 추가하세요
              </p>
            </div>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
              {favoriteRepos.map((repo) => {
                const score = scores[repo.id]
                const langColor = getLanguageColor(repo.language)
                const isBlackHole = (score?.healthScore ?? 50) < 2

                return (
                  <li key={repo.id}>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors group">
                      {/* 언어 색 닷 */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isBlackHole ? '#111' : langColor,
                          boxShadow: isBlackHole ? 'none' : `0 0 6px ${langColor}80`,
                        }}
                      />
                      {/* 레포명 — 클릭 시 패널 열기 */}
                      <button
                        onClick={() => handleRepoClick(repo.id)}
                        className="flex-1 text-left text-[11px] font-mono text-white/70 hover:text-white truncate transition-colors"
                      >
                        {repo.name}
                        {isBlackHole && (
                          <span className="ml-1 text-[9px] text-red-400">🕳</span>
                        )}
                      </button>
                      {/* 즐겨찾기 해제 */}
                      <button
                        onClick={() => toggleFavorite(repo.id)}
                        className="text-yellow-400/80 hover:text-yellow-300 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title="즐겨찾기 해제"
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

        {/* ── 하단 액션 ────────────────────────────────────────── */}
        <div className="px-3 pb-3 border-t border-white/8 mt-1 pt-2 flex items-center gap-2">
          {/* GitHub 프로필 바로가기 */}
          <a
            href={`https://github.com/${user.githubLogin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-center text-[10px] font-mono text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 rounded-lg transition-all"
          >
            GitHub 프로필 ↗
          </a>
          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="flex-1 py-2 text-center text-[10px] font-mono text-red-400/60 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
