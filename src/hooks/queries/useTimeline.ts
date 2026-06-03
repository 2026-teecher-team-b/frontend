/**
 * useTimeline — 레포 시간별 활동 타임라인 조회 (활동 차트용)
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}/timeline?hours=N
 * 응답: TimelinePointDto[]
 *   { bucket, watch, commitCount, prCreated, prMerged, issueOpened,
 *     issueClosed, starCount, releaseCount, activeScore, healthScore,
 *     brightnessScore, sizeScore }
 *
 * ScoreChart가 사용하는 RepoScore[] 형태로 매핑해 반환한다.
 * (기존 useScoreHistory는 미구현 더미였으며 이 훅으로 대체)
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { RepoScore } from '@/types/github'

interface TimelinePoint {
  bucket: string
  activeScore: number
  healthScore: number
  sizeScore: number
}

export function useTimeline(
  owner: string | null,
  repo: string | null,
  repoId: number | null,
  hours = 72,
  enabled = true,
) {
  return useQuery<RepoScore[], Error>({
    queryKey: ['timeline', owner, repo, hours],
    queryFn: async () => {
      const { data } = await apiClient.get<TimelinePoint[]>(
        `/repos/${owner}/${repo}/timeline`,
        { params: { hours } },
      )
      return data.map((p) => ({
        repoId:        repoId ?? 0,
        activityScore: p.activeScore,
        healthScore:   p.healthScore,
        sizeScore:     p.sizeScore,
        trendDelta:    0,
        updatedAt:     p.bucket,
      }))
    },
    enabled: enabled && !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
