/**
 * useRepoStats — 선택한 레포의 스타/포크/이슈 수 조회
 *
 * 목록 API(GET /repos)는 점수만 내려주고 star/fork/issue를 포함하지 않으므로,
 * star/fork/issue를 노출하는 유일한 엔드포인트인 검색 API에서 가져온다.
 *
 * 백엔드 엔드포인트: GET /repos/search?q={name}  →  List<RepoResponse>
 * 응답 항목: { id, fullName, starCount, forkCount, openIssuesCount, ... }
 *
 * 주의:
 *  - 라이브 백엔드에는 starCount만 존재. forkCount·openIssuesCount는
 *    백엔드 재배포 + 메타 재수집 이후에 채워진다(현재는 undefined → '—' 표시).
 *  - 검색은 fuzzy 매칭이므로 결과 중 id(우선)·fullName으로 정확히 매칭한다.
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { RepoStats } from '@/types/github'

interface SearchItem {
  id: number
  fullName: string
  starCount?: number
  forkCount?: number
  openIssuesCount?: number
}

export function useRepoStats(
  fullName: string | null,
  id: number | null,
  enabled = true,
) {
  return useQuery<RepoStats, Error>({
    queryKey: ['repo-stats', fullName],
    queryFn: async () => {
      const name = fullName!.split('/')[1] ?? fullName!
      const { data } = await apiClient.get<SearchItem[]>('/repos/search', {
        params: { q: name },
      })
      const match =
        data.find((d) => d.id === id) ??
        data.find((d) => d.fullName.toLowerCase() === fullName!.toLowerCase())
      if (!match) return {}
      return {
        starCount:      match.starCount,
        forkCount:      match.forkCount,
        openIssueCount: match.openIssuesCount,
      }
    },
    enabled: enabled && !!fullName,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
