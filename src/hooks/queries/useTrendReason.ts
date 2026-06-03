/**
 * useTrendReason — 레포 점수(활동) 변화 이유 조회
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}/trend
 * 응답: { owner, repo, trend, changeRate, reason, generatedAt }
 *  - trend: "상승" | "하락" | "보합" (7일 평균 대비 최근 24h 활동 변화)
 *  - reason: LLM이 생성한 자연어 설명 (Redis/DB 캐시 → 보통 즉시 응답)
 *
 * 첫 호출(미캐시) 시 LLM 생성으로 느릴 수 있어 timeout 90초.
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { TrendReason } from '@/types/github'

export function useTrendReason(
  owner: string | null,
  repo: string | null,
  enabled = true,
) {
  return useQuery<TrendReason, Error>({
    queryKey: ['trend-reason', owner, repo],
    queryFn: () =>
      apiClient
        .get<TrendReason>(`/repos/${owner}/${repo}/trend`, { timeout: 90_000 })
        .then((r) => r.data),
    enabled: enabled && !!owner && !!repo,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
