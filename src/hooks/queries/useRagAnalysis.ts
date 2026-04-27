/**
 * useRagAnalysis.ts
 *
 * RAG(Retrieval-Augmented Generation) 분석 요청 훅.
 * 사이드 패널의 "왜?" 버튼을 누르면 호출된다.
 *
 * API: POST /api/rag/analyze
 * Body: { repoId, question? }
 *
 * [DEV 동작]
 *  - API 실패 시 2초 지연 후 mock 분석 텍스트 반환
 *  - 실제 LLM 응답 형식을 미리 체험할 수 있도록 사실적인 내용으로 구성
 */

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { RagAnalysisRequest, RagAnalysisResponse } from '@/types/github'

// ── API 호출 ────────────────────────────────────────────────────────
async function postRagAnalysis(req: RagAnalysisRequest): Promise<RagAnalysisResponse> {
  const { data } = await apiClient.post<RagAnalysisResponse>('/api/rag/analyze', req)
  return data
}

// ── Mock 응답 (BE 미준비 시) ─────────────────────────────────────────
const MOCK_TEMPLATES = [
  (name: string) =>
    `**${name}** 저장소는 최근 24시간 동안 커밋 활동이 급증하며 트렌딩 지수가 상승했습니다.\n\n` +
    `주요 요인:\n` +
    `• **v2.x 릴리즈 준비**: 메인 브랜치에 대규모 기능 추가 PR이 병합되었습니다.\n` +
    `• **커뮤니티 반응**: GitHub Stars가 지난 1주 대비 +12% 증가, HackerNews Show HN 섹션에서 토론이 활발합니다.\n` +
    `• **README 업데이트**: 문서 개선으로 신규 기여자 유입이 증가했습니다.\n\n` +
    `*참고: 이 분석은 README, 릴리즈 노트, 최근 이슈/PR 데이터를 기반으로 생성되었습니다.*`,

  (name: string) =>
    `**${name}** 의 활동 지수가 높은 이유를 분석했습니다.\n\n` +
    `**기술적 관점**: 최근 성능 최적화 관련 이슈가 다수 해결되었으며, ` +
    `컨트리뷰터 수가 전월 대비 23% 증가했습니다.\n\n` +
    `**생태계 영향**: 이 프로젝트에 의존하는 하위 패키지 업데이트가 ` +
    `연쇄적으로 발생하며 GitHub의 Dependency Graph 내 노출이 증가했습니다.\n\n` +
    `**소셜 신호**: Twitter/X 개발자 커뮤니티에서 벤치마크 결과가 공유되며 ` +
    `자연 유입 트래픽이 늘었습니다.`,
]

async function mockRagAnalysis(req: RagAnalysisRequest, repoName: string): Promise<RagAnalysisResponse> {
  await new Promise((r) => setTimeout(r, 2000)) // LLM 응답 지연 시뮬레이션
  const template = MOCK_TEMPLATES[req.repoId % MOCK_TEMPLATES.length]
  return {
    repoId: req.repoId,
    question: req.question ?? '이 저장소의 활동이 증가한 이유는 무엇인가요?',
    analysis: template(repoName),
    sources: [
      `https://github.com/${repoName}`,
      `https://github.com/${repoName}/releases`,
      'https://news.ycombinator.com/item?id=example',
    ],
    confidence: 0.82 + Math.random() * 0.1,
    generatedAt: new Date().toISOString(),
  }
}

// ── Hook ────────────────────────────────────────────────────────────
/**
 * @param repoName - 화면에 표시용 이름 (mock에서만 사용)
 */
export function useRagAnalysis(repoName: string) {
  return useMutation<RagAnalysisResponse, Error, RagAnalysisRequest>({
    mutationFn: async (req) => {
      try {
        return await postRagAnalysis(req)
      } catch {
        if (import.meta.env.DEV) {
          return mockRagAnalysis(req, repoName)
        }
        throw new Error('AI 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    },
  })
}
