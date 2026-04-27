import { create } from 'zustand'
import type { UIStore } from '@/types/store'

export const useUIStore = create<UIStore>((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  selectedRepoId: null,
  isPanelOpen: false,
  hoveredRepoId: null,
  filterMode: 'all',
  favorites: [],
  user: null,
  followedRepoId: null,

  // ── 기본 인터랙션 ───────────────────────────────────────────────
  selectRepo: (repoId) =>
    set({
      selectedRepoId: repoId,
      isPanelOpen: repoId !== null,
      // 별 클릭 시 카메라 추적도 같이 설정
      followedRepoId: repoId,
    }),

  setHovered: (repoId) => set({ hoveredRepoId: repoId }),

  closePanel: () =>
    set({
      selectedRepoId: null,
      isPanelOpen: false,
      // 패널 닫으면 카메라 추적도 해제 → 자유 탐험 모드로
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

  /** 즐겨찾기 여부 확인 — get() 사용 (set 필요 없음) */
  isFavorite: (repoId) => get().favorites.includes(repoId),

  // ── 사용자 ──────────────────────────────────────────────────────
  setUser: (user) => set({ user }),

  // ── 카메라 추적 ─────────────────────────────────────────────────
  /** 카메라 추적 대상 설정 (null = 자유 탐험) */
  setCameraFollow: (repoId) => set({ followedRepoId: repoId }),
}))
