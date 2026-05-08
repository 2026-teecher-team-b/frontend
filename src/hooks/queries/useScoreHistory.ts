/**
 * useScoreHistory — 스코어 히스토리 조회
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}/score  (🔲 미구현)
 * → 구현 완료 전까지 API 호출 비활성화, 빈 배열 반환
 *
 * TODO: 백엔드 구현 후 아래 주석 처리된 코드로 교체
 */
import { useQuery } from '@tanstack/react-query'
import type { RepoScore } from '@/types/github'

export function useScoreHistory(repoId: number | null) {
  return useQuery<RepoScore[]>({
    queryKey: ['score-history', repoId],
    // 백엔드 미구현 — 항상 빈 배열 반환
    queryFn: () => Promise.resolve([] as RepoScore[]),
    enabled: false,
    staleTime: 60 * 1000,

    // TODO: 백엔드 구현 후 아래로 교체 (owner/repo 파라미터 필요)
    // queryFn: ({ queryKey: [, owner, repo] }) =>
    //   apiClient.get(`/repos/${owner}/${repo}/score`).then((r) => r.data.history),
  })
}
