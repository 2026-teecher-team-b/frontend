import type { Repository, RepoScore, UserInfo } from './github'
import type { StarProps } from './canvas'

/** 씬 필터 모드 */
export type FilterMode = 'all' | 'favorites'

// ──────────────────────────────────────────────────────────────────
// Galaxy Store — 실시간 데이터 상태
// ──────────────────────────────────────────────────────────────────

export interface GalaxyState {
  /** 전체 저장소 메타데이터 */
  repositories: Repository[]

  /**
   * repoId → RepoScore 매핑.
   * GET /repos 폴링으로 갱신. Star.tsx가 이 맵을 직접 구독.
   */
  scores: Record<number, RepoScore>

  /**
   * 3D 씬에 배치될 별 목록 (위치/식별 정보만 포함).
   * 점수는 scores 맵에 분리 저장.
   */
  stars: StarProps[]

  /**
   * 백엔드에서 마지막으로 데이터를 성공적으로 불러온 시각.
   * GET /repos 응답의 latestBucket 최댓값.
   */
  lastUpdatedAt: string | null

  /** 백엔드 데이터 로드 완료 여부 */
  isConnected: boolean
}

export interface GalaxyActions {
  setRepositories: (repos: Repository[]) => void
  updateScore: (repoId: number, score: RepoScore) => void
  setScores: (scores: Record<number, RepoScore>) => void
  setLastUpdatedAt: (isoString: string | null) => void
  setConnected: (connected: boolean) => void
}

export type GalaxyStore = GalaxyState & GalaxyActions

// ──────────────────────────────────────────────────────────────────
// UI Store — 인터랙션 상태
// ──────────────────────────────────────────────────────────────────

export interface UIState {
  selectedRepoId:   number | null
  isPanelOpen:      boolean
  hoveredRepoId:    number | null
  filterMode:       FilterMode
  favorites:        number[]
  user:             UserInfo | null
  followedRepoId:   number | null
  langFilter:       string[]
  searchQuery:      string

  /** 프로필 모달 열림 여부 */
  isProfileModalOpen:       boolean
  /** 비로그인 즐겨찾기 클릭 시 로그인 안내 모달 */
  isFavoriteLoginModalOpen: boolean
  /** 갱신 토스트 메시지 (null이면 숨김) */
  toastMessage: string | null

  /** 뷰 모드: 3D 회전 or 2D 위에서 아래 */
  viewMode: '3d' | '2d'
}

export interface UIActions {
  selectRepo:   (repoId: number | null) => void
  setHovered:   (repoId: number | null) => void
  closePanel:   () => void

  setFilterMode:     (mode: FilterMode) => void
  toggleFavorite:    (repoId: number) => void
  isFavorite:        (repoId: number) => boolean
  loadFavorites:     () => void

  setUser: (user: UserInfo | null) => void

  setCameraFollow: (repoId: number | null) => void

  toggleLangFilter: (lang: string) => void
  clearLangFilter:  () => void

  setSearchQuery: (query: string) => void

  openProfileModal:        () => void
  closeProfileModal:       () => void
  openFavoriteLoginModal:  () => void
  closeFavoriteLoginModal: () => void

  showToast: (msg: string, durationMs?: number) => void

  setViewMode: (mode: '3d' | '2d') => void
}

export type UIStore = UIState & UIActions
