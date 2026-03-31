import { create } from 'zustand'
import type { GalaxyStore } from '@/types/store'

export const useGalaxyStore = create<GalaxyStore>((set) => ({
  // ── State ──
  repositories: [],
  scores: {},
  stars: [],
  isConnected: false,

  // ── Actions ──
  setRepositories: (repos) =>
    set((state) => {
      // 저장소 목록 갱신 시 stars 배열도 함께 초기화
      // position은 physics.ts의 중력 알고리즘으로 계산 예정 (5~6주차)
      // 지금은 더미 랜덤 위치 사용
      const stars = repos.map((repo) => ({
        repoId: repo.id,
        name: repo.name,
        position: [
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
        ] as [number, number, number],
        activityScore: state.scores[repo.id]?.activityScore ?? 50,
        healthScore: state.scores[repo.id]?.healthScore ?? 50,
        language: repo.language,
        isBlackHole: (state.scores[repo.id]?.healthScore ?? 50) < 10,
      }))
      return { repositories: repos, stars }
    }),

  updateScore: (repoId, score) =>
    set((state) => ({
      scores: { ...state.scores, [repoId]: score },
      // 해당 별의 속성도 즉시 갱신
      stars: state.stars.map((star) =>
        star.repoId === repoId
          ? {
              ...star,
              activityScore: score.activityScore,
              healthScore: score.healthScore,
              isBlackHole: score.healthScore < 10,
            }
          : star,
      ),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
}))
