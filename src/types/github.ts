/**
 * GitHub 저장소 메타데이터
 *
 * 백엔드 RepoResponse 필드 (항상 존재):
 *   id, fullName, owner, name, description, starCount, language,
 *   defaultBranch, tracked, lastCollectedAt
 *
 * 더미 데이터 전용 필드 (optional — 백엔드 미구현):
 *   topics, forkCount, openIssueCount, pushedAt, htmlUrl
 */
export interface Repository {
  id: number
  name: string
  fullName: string        // e.g. "facebook/react"
  owner?: string          // 백엔드 제공 (더미엔 없음 → fullName에서 파싱)
  description: string | null
  language: string | null
  defaultBranch?: string  // 백엔드 제공
  tracked?: boolean       // 백엔드 제공
  lastCollectedAt?: string // 백엔드 제공 (ISO 8601)
  // 아래는 더미 데이터 전용 — 백엔드 구현 시 추가 예정
  topics?: string[]
  starCount?: number
  forkCount?: number
  openIssueCount?: number
  pushedAt?: string       // ISO 8601 — lastCollectedAt으로 대체 예정
  htmlUrl?: string
}

/**
 * 점수 변화 이유 — GET /repos/{owner}/{repo}/trend 응답
 * 백엔드 RepoController.trend() → TrendReasonService (LLM 생성, Redis/DB 캐시)
 */
export interface TrendReason {
  owner: string
  repo: string
  trend: '상승' | '하락' | '보합' | string  // 7일 평균 대비 24h 활동 변화
  changeRate: number                        // 변화율 (%)
  reason: string                            // LLM이 생성한 자연어 설명
  generatedAt: string                       // ISO 8601
}

/**
 * 저장소 통계 — GET /repos/search 의 RepoResponse 일부
 * starCount는 항상 제공, forkCount·openIssueCount는 백엔드 재배포·재수집 후 제공
 */
export interface RepoStats {
  starCount?: number
  forkCount?: number
  openIssueCount?: number
}

/** 저장소 활동 점수 (BE에서 산출) */
export interface RepoScore {
  repoId: number
  activityScore: number   // 0 ~ 100 (commit/PR/issue 기반) → 깔때기 Y 위치
  healthScore: number     // 0 ~ 100 (유지보수 상태) → 색 밝기, 블랙홀 여부
  sizeScore: number       // 0 ~ 100 (star수·fork수 기반) → 별의 기본 크기
  trendDelta: number      // 전 주기 대비 변화량 (+/-)
  updatedAt: string
}

/** GitHub OAuth 로그인 사용자 — GET /auth/me 응답 */
export interface UserInfo {
  userId: number
  githubId: number
  githubLogin: string   // GitHub 사용자명 (ex. "kimdoyoung1110")
  profileUrl: string    // GitHub 프로필 이미지 URL
  createdAt: string
}

/** 실시간 SSE/WebSocket 이벤트 페이로드 */
export interface RepoScoreEvent {
  type: 'SCORE_UPDATE' | 'NEW_TRENDING' | 'BLACKHOLE'
  repoId: number
  repoName: string
  score: RepoScore
}
