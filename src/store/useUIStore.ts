import { create } from 'zustand'
import type { UIStore } from '@/types/store'

export const useUIStore = create<UIStore>((set) => ({
  // ── State ──
  selectedRepoId: null,
  isPanelOpen:    false,
  hoveredRepoId:  null,
  filterMode:     'all',
  favorites:      [],
  user:           null,
  followedRepoId: null,
  langFilter:     [],
  searchQuery:    '',

  // ── Actions ──
  selectRepo: (repoId) =>
    set({
      selectedRepoId: repoId,
      isPanelOpen:    repoId !== null,
      // 별 클릭 → 카메라가 해당 별을 따라감
      followedRepoId: repoId,
    }),

  setHovered: (repoId) => set({ hoveredRepoId: repoId }),

  closePanel: () =>
    set({
      selectedRepoId: null,
      isPanelOpen:    false,
      // 패널 닫으면 카메라 추적 해제 → 전체 뷰 복귀
      followedRepoId: null,
    }),

  // ── 필터 / My Galaxy ────────────────────────────────────────────
  setFilterMode: (mode) => set({ filterMode: mode }),

  toggleFavorite: (repoId) =>
    set((state) => {
      const already = state.favorites.includes(repoId)
      return {
        favorites: already
          ? state.favorites.filter((id) => id !== repoId)
          : [...state.favorites, repoId],
      }
    }),

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
}))
