/**
 * RAGAnalysis.tsx — AI RAG 질의응답 패널
 *
 * 흐름:
 *  1. "AI 분석" 섹션에 기본 질문이 입력창에 미리 채워짐
 *  2. 사용자가 원하는 질문으로 수정 후 전송 가능
 *  3. 전송 → GET /repos/{owner}/{repo}/explain?q=... 호출
 *  4. 답변을 패널 내에 표시
 *
 * 백엔드: RepoController.explain()
 * 엔드포인트: GET /repos/{owner}/{repo}/explain?q=...
 * 응답: { "repo": "...", "question": "...", "answer": "..." }
 */
import { useState, useRef } from 'react'
import { useRagExplain } from '@/hooks/queries/useRagAnalysis'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Props {
  owner: string
  repo: string
}

const DEFAULT_QUESTION = '이 저장소에 대해 설명해주세요'

export default function RAGAnalysis({ owner, repo }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError } = useRagExplain(
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
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">AI 분석</span>
        <span className="text-[9px] text-white/20 font-mono">· RAG</span>
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
              flex-1 bg-white/4 border border-white/10 rounded-lg
              px-3 py-1.5 text-[11px] font-mono text-white/70
              placeholder:text-white/20
              focus:outline-none focus:border-blue-400/40 focus:bg-white/6
              transition-all
            "
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="
              px-3 py-1.5 rounded-lg text-[10px] font-mono
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
        <div className="flex items-center gap-2.5 py-3 text-[10px] text-white/30 font-mono">
          <LoadingSpinner size={13} />
          <span>AI가 분석 중입니다…</span>
        </div>
      )}

      {/* 오류 */}
      {isError && !isLoading && (
        <div className="py-2">
          <p className="text-[10px] text-red-400/70 font-mono leading-relaxed">
            분석에 실패했습니다.
          </p>
          <p className="text-[9px] text-white/25 font-mono mt-1">
            RAG 서버가 준비 중이거나, 이 저장소의 데이터가 아직 수집되지 않았을 수 있어요.
          </p>
          <button
            onClick={() => setSubmittedQuestion(null)}
            className="mt-2 text-[9px] text-white/30 hover:text-white/60 font-mono underline transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 답변 */}
      {data && !isLoading && (
        <div className="bg-white/3 border border-white/8 rounded-lg p-3">
          {/* 질문 표시 */}
          {submittedQuestion && (
            <p className="text-[9px] text-white/30 font-mono mb-2 pb-2 border-b border-white/8">
              Q. {submittedQuestion}
            </p>
          )}
          {/* 답변 */}
          <p className="text-[11px] text-white/70 font-mono leading-relaxed whitespace-pre-wrap">
            {data}
          </p>
          {/* 다른 질문하기 */}
          <button
            onClick={() => { setSubmittedQuestion(null); inputRef.current?.focus() }}
            className="mt-2.5 text-[9px] text-blue-400/60 hover:text-blue-300 font-mono transition-colors"
          >
            다른 질문하기 →
          </button>
        </div>
      )}

      {/* 처음 상태 (아직 질문 안 함) */}
      {!submittedQuestion && !isLoading && (
        <p className="text-[9px] text-white/20 font-mono">
          이 저장소에 대해 AI에게 질문해보세요.
        </p>
      )}
    </div>
  )
}
