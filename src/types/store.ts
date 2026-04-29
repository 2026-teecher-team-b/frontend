import type { Repository, RepoScore, UserInfo } from './github'
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

  /** 씬 필터 모드 (전체 / My Galaxy) */
  filterMode: FilterMode
  /**
   * 즐겨찾기(My Galaxy) 저장소 ID 목록.
   */
  favorites: number[]

  /** 로그인한 사용자 정보 (null = 비로그인) */
  user: UserInfo | null

  /**
   * 카메라가 추적할 별의 repoId.
   * null = 자유 탐험 모드, 숫자 = 해당 별로 카메라 이동 + 추적
   */
  followedRepoId: number | null

  /**
   * 언어 필터 목록. 빈 배열 = 전체 표시.
   * 항목이 있으면 해당 언어 별만 보임.
   */
  langFilter: string[]

  /** 검색 쿼리 */
  searchQuery: string
}

export interface UIActions {
  selectRepo: (repoId: number | null) => void
  setHovered: (repoId: number | null) => void
  closePanel: () => void

  /** 씬 필터 전환 */
  setFilterMode: (mode: FilterMode) => void
  /** 즐겨찾기 토글 (추가/제거) */
  toggleFavorite: (repoId: number) => void
  /** 즐겨찾기 여부 확인 */
  isFavorite: (repoId: number) => boolean

  /** 로그인 사용자 정보 세팅 */
  setUser: (user: UserInfo | null) => void

  /** 카메라 추적 대상 설정 */
  setCameraFollow: (repoId: number | null) => void

  /** 언어 필터 토글 (켜기/끄기) */
  toggleLangFilter: (lang: string) => void
  /** 언어 필터 전체 초기화 */
  clearLangFilter: () => void

  /** 검색 쿼리 업데이트 */
  setSearchQuery: (query: string) => void
}

export type UIStore = UIState & UIActions
