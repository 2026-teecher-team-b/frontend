/**
 * RAGAnalysis.tsx — AI RAG 질의응답 패널
 *
 * 흐름:
 *  1. "AI 분석" 섹션에 기본 질문이 입력창에 미리 채워짐
 *  2. 사용자가 원하는 질문으로 수정 후 전송 가능
 *  3. 전송 → GET /repos/{owner}/{repo}/explain?q=... 호출
 *  4. 답변을 마크다운으로 렌더링해 표시 (페이드인)
 *
 * 백엔드: RepoController.explain()
 * 엔드포인트: GET /repos/{owner}/{repo}/explain?q=...
 * 응답: { "repo": "...", "question": "...", "answer": "..." }
 */
import { useState, useRef } from 'react'
import { AxiosError } from 'axios'
import { useRagExplain } from '@/hooks/queries/useRagAnalysis'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Markdown from '@/components/common/Markdown'

interface Props {
  owner: string
  repo: string
}

const DEFAULT_QUESTION = '이 저장소에 대해 설명해주세요'

/** 에러를 사용자 친화적 한국어 메시지로 변환 (HTML/JSON 덤프 방지) */
function friendlyErrorMessage(error: Error | null): string {
  if (!error) return '알 수 없는 오류가 발생했습니다.'
  const ax = error as AxiosError
  const status = ax?.response?.status
  if (status === 502 || status === 503 || status === 504)
    return 'AI 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
  if (ax?.code === 'ECONNABORTED')
    return '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
  if (ax?.isAxiosError && !ax.response)
    return '네트워크 연결을 확인해주세요.'
  if (status && status >= 400 && status < 500)
    return '요청을 처리할 수 없습니다.'
  return error.message || '분석 중 오류가 발생했습니다.'
}

export default function RAGAnalysis({ owner, repo }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError, error } = useRagExplain(
    owner || null,
    repo  || null,
    submittedQuestion,
  )

  const handleSubmit = () => {
    const q = inputValue.trim() || DEFAULT_QUESTION
    setSubmittedQuestion(q)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="mt-4 border-t border-white/8 pt-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] text-white/45 font-mono uppercase tracking-widest">AI 분석</span>
        <span className="text-[11px] text-white/25 font-mono">· RAG</span>
      </div>

      {/* 질문 입력창 */}
      {!isLoading && (
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={submittedQuestion ?? DEFAULT_QUESTION}
            className="
              flex-1 bg-black/60 border border-white/20 rounded-lg
              px-3 py-2 text-[13px] font-mono text-white/90
              placeholder:text-white/35
              focus:outline-none focus:border-blue-400/60 focus:bg-black/70
              transition-all
            "
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="
              px-4 py-2 rounded-lg text-[13px] font-mono cursor-pointer
              bg-blue-500/15 hover:bg-blue-500/25
              border border-blue-400/25 hover:border-blue-400/50
              text-blue-300 hover:text-blue-200
              transition-all disabled:opacity-40 disabled:cursor-not-allowed
              flex-shrink-0
            "
          >
            질문
          </button>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center gap-2.5 py-3 text-[13px] text-white/35 font-mono">
          <LoadingSpinner size={15} />
          <span>AI가 분석 중입니다…</span>
        </div>
      )}

      {/* 오류 */}
      {isError && !isLoading && (
        <div className="py-2">
          <p className="text-[13px] text-red-400/75 font-mono leading-relaxed">
            ✕ {friendlyErrorMessage(error)}
          </p>
          <button
            onClick={() => {
              const q = submittedQuestion
              setSubmittedQuestion(null)
              // 같은 질문으로 즉시 재요청
              if (q) requestAnimationFrame(() => setSubmittedQuestion(q))
            }}
            className="mt-2 text-[12px] text-blue-400/70 hover:text-blue-300 font-mono underline transition-colors cursor-pointer"
          >
            다시 시도 →
          </button>
        </div>
      )}

      {/* 답변 */}
      {data && !isLoading && (
        <div className="bg-white/3 border border-white/8 rounded-lg p-3.5 animate-[fadeIn_0.4s_ease]">
          {/* 질문 표시 */}
          {submittedQuestion && (
            <p className="text-[12px] text-white/35 font-mono mb-2.5 pb-2.5 border-b border-white/8">
              Q. {submittedQuestion}
            </p>
          )}
          {/* 답변 — 마크다운 렌더링 */}
          <Markdown content={data} />
          {/* 다른 질문하기 */}
          <button
            onClick={() => { setSubmittedQuestion(null); inputRef.current?.focus() }}
            className="mt-3 text-[12px] text-blue-400/70 hover:text-blue-300 font-mono transition-colors cursor-pointer"
          >
            다른 질문하기 →
          </button>
        </div>
      )}

      {/* 처음 상태 (아직 질문 안 함) */}
      {!submittedQuestion && !isLoading && (
        <p className="text-[12px] text-white/25 font-mono">
          이 저장소에 대해 AI에게 질문해보세요.
        </p>
      )}
    </div>
  )
}
