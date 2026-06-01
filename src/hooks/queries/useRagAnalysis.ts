/**
 * useRagExplain — AI RAG 질의응답
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}/explain?q={question}
 * 응답: { "repo": "...", "question": "...", "answer": "..." }
 *
 * - question 이 null 이면 API 호출 안 함 (버튼 클릭 전 대기)
 * - 10분 캐시 유지 (같은 질문 재요청 시 즉시 응답)
 * - retry: false — RAG 서버 미준비 시 즉시 오류 표시
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'

interface ExplainResponse {
  repo: string
  question: string
  answer: string
}

export function useRagExplain(
  owner: string | null,
  repo: string | null,
  question: string | null,
) {
  return useQuery<string, Error>({
    queryKey: ['rag-explain', owner, repo, question],
    queryFn: () =>
      apiClient
        .get<ExplainResponse>(`/repos/${owner}/${repo}/explain`, {
          params:  { q: question },
          timeout: 90_000,   // RAG/LLM은 최대 90초 허용 (글로벌 10s 오버라이드)
        })
        .then((r) => {
          // 응답 구조 검증 — answer 필드가 없으면 명확한 에러
          if (!r.data?.answer) {
            throw new Error(`응답에 answer 필드가 없습니다: ${JSON.stringify(r.data)}`)
          }
          return r.data.answer
        }),
    enabled: !!owner && !!repo && !!question,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}
