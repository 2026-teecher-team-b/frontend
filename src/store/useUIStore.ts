import { create } from 'zustand'
import type { UIStore } from '@/types/store'

export const useUIStore = create<UIStore>((set, get) => ({
  // ── State ──
  selectedRepoId:           null,
  isPanelOpen:              false,
  hoveredRepoId:            null,
  filterMode:               'all',
  favorites:                [],
  user:                     null,
  followedRepoId:           null,
  langFilter:               [],
  searchQuery:              '',
  isProfileModalOpen:       false,
  isFavoriteLoginModalOpen: false,
  toastMessage:             null,

  // ── Actions ──
  selectRepo: (repoId) =>
    set({
      selectedRepoId: repoId,
      isPanelOpen:    repoId !== null,
      followedRepoId: repoId,
    }),

  setHovered: (repoId) => set({ hoveredRepoId: repoId }),

  closePanel: () =>
    set({
      selectedRepoId: null,
      isPanelOpen:    false,
      followedRepoId: null,
    }),

  // ── 필터 ────────────────────────────────────────────────────────
  setFilterMode: (mode) => set({ filterMode: mode }),

  /**
   * 즐겨찾기 토글.
   * 비로그인 상태에서 클릭하면 로그인 안내 모달을 열고 종료.
   */
  toggleFavorite: (repoId) => {
    const { user, favorites } = get()
    if (!user) {
      set({ isFavoriteLoginModalOpen: true })
      return
    }
    const already = favorites.includes(repoId)
    set({
      favorites: already
        ? favorites.filter((id) => id !== repoId)
        : [...favorites, repoId],
    })
  },

  isFavorite: (repoId) => get().favorites.includes(repoId),

  // ── 사용자 ──────────────────────────────────────────────────────
  setUser: (user) => set({ user }),

  // ── 카메라 추적 ─────────────────────────────────────────────────
  setCameraFollow: (repoId) => set({ followedRepoId: repoId }),

  // ── 언어 필터 ────────────────────────────────────────────────────
  toggleLangFilter: (lang) =>
    set((state) => {
      const active = state.langFilter.includes(lang)
      return {
        langFilter: active
          ? state.langFilter.filter((l) => l !== lang)
          : [...state.langFilter, lang],
      }
    }),

  clearLangFilter: () => set({ langFilter: [] }),

  // ── 검색 ────────────────────────────────────────────────────────
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── 프로필 모달 ─────────────────────────────────────────────────
  openProfileModal:  () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),

  // ── 즐겨찾기 로그인 모달 ────────────────────────────────────────
  openFavoriteLoginModal:  () => set({ isFavoriteLoginModalOpen: true }),
  closeFavoriteLoginModal: () => set({ isFavoriteLoginModalOpen: false }),

  // ── 토스트 알림 ─────────────────────────────────────────────────
  showToast: (msg, durationMs = 3000) => {
    set({ toastMessage: msg })
    setTimeout(() => set({ toastMessage: null }), durationMs)
  },
}))
