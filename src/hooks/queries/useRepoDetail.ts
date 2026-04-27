/**
 * useRepoDetail.ts
 *
 * 저장소 상세 정보를 BE REST API에서 가져온다.
 * (GET /api/repos/{repoId})
 *
 * [DEV 동작]
 *  - 실제 API 호출 시도 → 실패하면 더미 데이터 반환 (1초 지연 시뮬레이션)
 *  - BE가 준비되면 추가 설정 없이 자동으로 실제 API 사용
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { RepoDetail } from '@/types/github'
import { useGalaxyStore } from '@/store/useGalaxyStore'

// ── API 호출 ────────────────────────────────────────────────────────
async function fetchRepoDetail(repoId: number): Promise<RepoDetail> {
  const { data } = await apiClient.get<RepoDetail>(`/api/repos/${repoId}`)
  return data
}

// ── 더미 fallback (BE 미준비 시) ─────────────────────────────────────
function makeMockDetail(repoId: number, repos: ReturnType<typeof useGalaxyStore.getState>['repositories']): RepoDetail {
  const repo = repos.find((r) => r.id === repoId)
  const now = new Date().toISOString()
  return {
    id: repo?.id ?? repoId,
    name: repo?.name ?? `repo-${repoId}`,
    fullName: repo?.fullName ?? `owner/repo-${repoId}`,
    description: repo?.description ?? null,
    language: repo?.language ?? null,
    topics: repo?.topics ?? [],
    starCount: repo?.starCount ?? 0,
    forkCount: repo?.forkCount ?? 0,
    openIssueCount: repo?.openIssueCount ?? 0,
    pushedAt: repo?.pushedAt ?? now,
    htmlUrl: repo?.htmlUrl ?? `https://github.com/owner/repo-${repoId}`,
    trendStatus: repo?.trendStatus ?? 'Stable',
    // RepoDetail 전용 필드
    ownerName: repo?.fullName?.split('/')[0] ?? 'unknown',
    repoName: repo?.name ?? `repo-${repoId}`,
    repoUrl: repo?.htmlUrl ?? `https://github.com/owner/repo-${repoId}`,
    firstSeenAt: now,
    lastSeenAt: now,
    isDeleted: false,
  }
}

// ── Hook ────────────────────────────────────────────────────────────
export function useRepoDetail(repoId: number | null) {
  const repositories = useGalaxyStore((s) => s.repositories)

  return useQuery<RepoDetail>({
    queryKey: ['repoDetail', repoId],
    queryFn: async () => {
      if (!repoId) throw new Error('repoId is null')
      try {
        return await fetchRepoDetail(repoId)
      } catch {
        // DEV 모드: API 실패 시 로컬 더미 데이터로 fallback
        if (import.meta.env.DEV) {
          await new Promise((r) => setTimeout(r, 300)) // 짧은 지연으로 로딩 체험
          return makeMockDetail(repoId, repositories)
        }
        throw new Error(`저장소 정보를 불러오지 못했습니다. (id=${repoId})`)
      }
    },
    enabled: repoId !== null,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  })
}
