import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { RepoScore } from '@/types/github'

export function useScoreHistory(repoId: number | null) {
  return useQuery<RepoScore[]>({
    queryKey: ['score-history', repoId],
    queryFn: () => apiClient.get(`/api/repos/${repoId}/scores`).then((r) => r.data),
    enabled: repoId !== null,
    staleTime: 60 * 1000,
  })
}
