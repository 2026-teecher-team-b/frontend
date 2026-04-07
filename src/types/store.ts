import type { Repository, RepoScore } from './github'
import type { StarProps } from './canvas'

// ──────────────────────────────────────────────────────────────────
// Galaxy Store — 실시간 데이터 상태
// ──────────────────────────────────────────────────────────────────

export interface GalaxyState {
  /** 전체 저장소 메타데이터 */
  repositories: Repository[]

  /**
   * repoId → RepoScore 매핑.
   * WebSocket 이벤트가 도착할 때 updateScore()로 갱신된다.
   * Star.tsx가 이 맵을 직접 구독 → 변경된 별만 리렌더링.
   */
  scores: Record<number, RepoScore>

  /**
   * 3D 씬에 배치될 별 목록 (위치/식별 정보만 포함).
   * 점수는 scores 맵에 분리 저장되어 있다.
   */
  stars: StarProps[]

  /** WebSocket 연결 상태 */
  isConnected: boolean
}

export interface GalaxyActions {
  /** 저장소 목록 초기 로드 — 클러스터 위치 자동 계산 */
  setRepositories: (repos: Repository[]) => void
  /** 특정 저장소 점수 갱신 (WebSocket 수신 시 호출) */
  updateScore: (repoId: number, score: RepoScore) => void
  /** WebSocket 연결 상태 세팅 */
  setConnected: (connected: boolean) => void
}

export type GalaxyStore = GalaxyState & GalaxyActions

// ──────────────────────────────────────────────────────────────────
// UI Store — 인터랙션 상태
// ──────────────────────────────────────────────────────────────────

export interface UIState {
  /** 현재 선택된 별의 repoId (null = 선택 없음) */
  selectedRepoId: number | null
  /** 우측 사이드 패널 열림 여부 */
  isPanelOpen: boolean
  /** 툴팁 표시 대상 repoId (hover) */
  hoveredRepoId: number | null
}

export interface UIActions {
  selectRepo: (repoId: number | null) => void
  setHovered: (repoId: number | null) => void
  closePanel: () => void
}

export type UIStore = UIState & UIActions
