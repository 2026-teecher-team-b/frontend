import { create } from 'zustand'
import type { UIStore } from '@/types/store'

export const useUIStore = create<UIStore>((set) => ({
  // ── State ──
  selectedRepoId: null,
  isPanelOpen: false,
  hoveredRepoId: null,

  // ── Actions ──
  selectRepo: (repoId) =>
    set({ selectedRepoId: repoId, isPanelOpen: repoId !== null }),

  setHovered: (repoId) => set({ hoveredRepoId: repoId }),

  closePanel: () => set({ selectedRepoId: null, isPanelOpen: false }),
}))
