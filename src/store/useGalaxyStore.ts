// 별 및 저장소 상태 관리를 위한 zustand store
import { create } from 'zustand'
//
import type { GalaxyStore } from '@/types/store'
import { generateClusteredPosition } from '@/utils/physics'

export const useGalaxyStore = create<GalaxyStore>((set) => ({
  // ── State ───────────────────────────────────────────────────────
  repositories: [],
  scores: {},
  stars: [],
  isConnected: false,
  lastUpdatedAt: null,

  // ── Actions ─────────────────────────────────────────────────────

  /**
   * 저장소 목록 초기 로드.
   * 각 저장소에 언어별 클러스터 위치를 부여하고 stars 배열을 구성한다.
   * 점수 데이터는 scores 맵에 별도 관리되므로 StarProps에 포함하지 않는다.
   */
  setRepositories: (repos) =>
    set(() => {
      const stars = repos.map((repo) => ({
        repoId: repo.id,
        name: repo.name,
        position: generateClusteredPosition(repo.language),
        language: repo.language,
      }))
      return { repositories: repos, stars }
    }),

  /**
   * 특정 저장소의 점수 갱신.
   * scores 맵만 교체하므로 해당 repoId를 구독한 Star만 리렌더링된다.
   * (나머지 별은 영향 없음 → 성능 최적화의 핵심)
   */
  updateScore: (repoId, score) =>
    set((state) => ({
      scores: { ...state.scores, [repoId]: score },
    })),

  /**
   * 초기 점수 일괄 세팅.
   * 백엔드 GET /repos 응답에서 activityScore/healthScore를 한 번에 주입한다.
   */
  setScores: (scores) => set({ scores }),

  /**
   * 마지막 데이터 갱신 시각 세팅.
   * App.tsx에서 GET /repos 성공 시 latestBucket 최댓값을 저장한다.
   */
  setLastUpdatedAt: (lastUpdatedAt) => set({ lastUpdatedAt }),

  /**
   * 백엔드 연결/데이터 로드 성공 여부.
   * WebSocket 제거 후 "첫 데이터 로드 성공" 표시로 재활용.
   */
  setConnected: (connected) => set({ isConnected: connected }),
}))
