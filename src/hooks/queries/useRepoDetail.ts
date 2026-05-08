/**
 * useRepoDetail — 단일 repo 상세 조회
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}
 * - store에 이미 캐시된 경우 API 호출 스킵
 * - 5분 캐시 유지
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { Repository } from '@/types/github'
import { useGalaxyStore } from '@/store/useGalaxyStore'

export function useRepoDetail(owner: string | null, repo: string | null) {
  // 이미 store에 있으면 API 호출 스킵
  const cached = useGalaxyStore((s) =>
    owner && repo
      ? s.repositories.find(
          (r) =>
            (r.owner ?? r.fullName.split('/')[0]) === owner && r.name === repo,
        )
      : undefined,
  )

  const query = useQuery<Repository>({
    queryKey: ['repo', owner, repo],
    queryFn: () =>
      apiClient.get<Repository>(`/repos/${owner}/${repo}`).then((r) => r.data),
    enabled: owner !== null && repo !== null && !cached,
    staleTime: 5 * 60 * 1000,
  })

  return { repo: cached ?? query.data, isLoading: query.isLoading, error: query.error }
}
