import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'

interface RagResponse { analysis: string }

export function useRagAnalysis() {
  return useMutation<RagResponse, Error, number>({
    mutationFn: (repoId) =>
      apiClient.post('/api/rag/analyze', { repoId }).then((r) => r.data),
  })
}
