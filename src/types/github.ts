/** GitHub 저장소 메타데이터 */
export interface Repository {
  id: number
  name: string
  fullName: string    // e.g. "facebook/react"
  description: string | null
  language: string | null
  topics: string[]
  starCount: number
  forkCount: number
  openIssueCount: number
  pushedAt: string    // ISO 8601
  htmlUrl: string
}

/** 저장소 활동 점수 (BE에서 산출) */
export interface RepoScore {
  repoId: number
  activityScore: number   // 0 ~ 100 (commit/PR/issue 기반)
  healthScore: number     // 0 ~ 100 (유지보수 상태)
  trendDelta: number      // 전 주기 대비 변화량 (+/-)
  updatedAt: string
}

/** GitHub OAuth 로그인 사용자 */
export interface UserInfo {
  login: string
  avatarUrl: string
  name: string | null
}

/** 실시간 SSE/WebSocket 이벤트 페이로드 */
export interface RepoScoreEvent {
  type: 'SCORE_UPDATE' | 'NEW_TRENDING' | 'BLACKHOLE'
  repoId: number
  repoName: string
  score: RepoScore
}
