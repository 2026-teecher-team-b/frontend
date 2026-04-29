import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { Repository } from '@/types/github'
import { useGalaxyStore } from '@/store/useGalaxyStore'

export function useRepoDetail(repoId: number | null) {
  // 이미 store에 있으면 API 호출 스킵
  const cached = useGalaxyStore((s) =>
    repoId ? s.repositories.find((r) => r.id === repoId) : undefined,
  )

  const query = useQuery<Repository>({
    queryKey: ['repo', repoId],
    queryFn: () => apiClient.get(`/api/repos/${repoId}`).then((r) => r.data),
    enabled: repoId !== null && !cached,
    staleTime: 5 * 60 * 1000,
  })

  return { repo: cached ?? query.data, isLoading: query.isLoading, error: query.error }
}
