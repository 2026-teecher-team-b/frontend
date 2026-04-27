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
  trendStatus?: 'Rising' | 'Hot' | 'Stable' | 'Declining' | 'Unknown'
}

/** 저장소 활동 점수 (BE에서 산출) */
export interface RepoScore {
  repoId: number
  activityScore: number   // 0 ~ 100 (commit/PR/issue 기반)
  healthScore: number     // 0 ~ 100 (유지보수 상태)
  trendDelta: number      // 전 주기 대비 변화량 (+/-)
  updatedAt: string
}

/** 실시간 SSE/WebSocket 이벤트 페이로드 */
export interface RepoScoreEvent {
  type: 'SCORE_UPDATE' | 'NEW_TRENDING' | 'BLACKHOLE'
  repoId: number
  repoName: string
  score: RepoScore
}

// ──────────────────────────────────────────────────────────────────
// 상세 조회 / 시계열 / RAG / 사용자 타입
// ──────────────────────────────────────────────────────────────────

/** 저장소 상세 정보 (GET /api/repos/{repoId}) */
export interface RepoDetail extends Repository {
  ownerName: string
  repoName: string
  repoUrl: string
  firstSeenAt: string     // ISO 8601 — 우리 시스템 최초 발견일
  lastSeenAt: string      // ISO 8601 — 마지막 업데이트
  isDeleted: boolean
}

/**
 * 시계열 점수 한 버킷 (GET /api/repos/{repoId}/scores)
 * repo_time 테이블 row에 대응
 */
export interface ScoreHistoryEntry {
  bucket: string         // ISO 8601 — 집계 시각 (예: "2026-04-27T14:00:00Z")
  commitCount: number
  prCount: number
  issueCount: number
  releaseCount: number
  activeScore: number    // 별 밝기 기준 (0~100)
  healthScore: number    // 블랙홀 판정 기준 (0~100)
  brightnessScore: number
  sizeScore: number
}

/** RAG 분석 요청 body (POST /api/rag/analyze) */
export interface RagAnalysisRequest {
  repoId: number
  question?: string      // 없으면 BE 기본 질문 사용
}

/** RAG 분석 응답 */
export interface RagAnalysisResponse {
  repoId: number
  question: string
  analysis: string       // LLM이 생성한 분석 텍스트
  sources: string[]      // 참조한 원본 URL 목록
  confidence: number     // 0.0 ~ 1.0
  generatedAt: string    // ISO 8601
}

/** GitHub OAuth 로그인 후 반환되는 사용자 정보 (GET /api/users/me) */
export interface UserInfo {
  userId: number
  username: string         // GitHub 로그인 ID
  profileImageUrl: string  // GitHub 아바타 URL
  email: string | null
}
