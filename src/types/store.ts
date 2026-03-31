import type { Repository, RepoScore } from './github'
import type { StarProps } from './canvas'

// ──────────────────────────────────────────────
// Galaxy Store (실시간 데이터 상태)
// ──────────────────────────────────────────────
export interface GalaxyState {
  /** 전체 저장소 목록 */
  repositories: Repository[]
  /** repoId → score 매핑 */
  scores: Record<number, RepoScore>
  /** 3D 씬에 배치될 별 목록 (position 포함) */
  stars: StarProps[]
  /** WebSocket 연결 여부 */
  isConnected: boolean
}

export interface GalaxyActions {
  setRepositories: (repos: Repository[]) => void
  updateScore: (repoId: number, score: RepoScore) => void
  setConnected: (connected: boolean) => void
}

export type GalaxyStore = GalaxyState & GalaxyActions

// ──────────────────────────────────────────────
// UI Store (인터랙션 상태)
// ──────────────────────────────────────────────
export interface UIState {
  /** 현재 선택된 별의 repoId (null = 선택 없음) */
  selectedRepoId: number | null
  /** 우측 사이드 패널 열림 여부 */
  isPanelOpen: boolean
  /** 툴팁 표시 대상 repoId */
  hoveredRepoId: number | null
}

export interface UIActions {
  selectRepo: (repoId: number | null) => void
  setHovered: (repoId: number | null) => void
  closePanel: () => void
}

export type UIStore = UIState & UIActions
