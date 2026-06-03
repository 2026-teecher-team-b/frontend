/**
 * useRagExplain — AI RAG 질의응답
 *
 * 백엔드 엔드포인트: GET /repos/{owner}/{repo}/explain?q={question}
 * 응답: { "repo": "...", "question": "...", "answer": "..." }
 *
 * - question 이 null 이면 API 호출 안 함 (버튼 클릭 전 대기)
 * - 10분 캐시 유지 (같은 질문 재요청 시 즉시 응답)
 * - 502/504/타임아웃/네트워크 오류는 1회 재시도 (LLM 응답 지연 대비)
 * - nginx가 502 시 JSON이 아닌 HTML을 반환하므로 응답 구조를 방어적으로 검증
 */
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { apiClient } from '@/api/axios'

interface ExplainResponse {
  repo: string
  question: string
  answer: string
}

/** 게이트웨이/네트워크/타임아웃 등 일시적 오류인지 판별 → 재시도 대상 */
export function isTransientError(error: unknown): boolean {
  const ax = error as AxiosError
  const status = ax?.response?.status
  if (status === 502 || status === 503 || status === 504) return true
  // 타임아웃(ECONNABORTED) 또는 응답 자체가 없는 네트워크 오류
  if (ax?.code === 'ECONNABORTED') return true
  if (ax && !ax.response && ax.isAxiosError) return true
  return false
}

export function useRagExplain(
  owner: string | null,
  repo: string | null,
  question: string | null,
) {
  return useQuery<string, Error>({
    queryKey: ['rag-explain', owner, repo, question],
    queryFn: async () => {
      const res = await apiClient.get<ExplainResponse>(
        `/repos/${owner}/${repo}/explain`,
        {
          params:  { q: question },
          timeout: 90_000,   // RAG/LLM은 최대 90초 허용 (글로벌 10s 오버라이드)
        },
      )
      const data = res.data
      // 502 등에서 nginx가 HTML 문자열을 반환하면 data가 객체가 아님 → 방어
      if (typeof data !== 'object' || data === null || typeof data.answer !== 'string') {
        throw new Error('AI 서버가 올바른 응답을 반환하지 않았습니다.')
      }
      return data.answer
    },
    enabled: !!owner && !!repo && !!question,
    staleTime: 10 * 60 * 1000,
    // 일시적 게이트웨이/네트워크 오류만 1회 재시도 (4xx 등은 즉시 표시)
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
  })
}
