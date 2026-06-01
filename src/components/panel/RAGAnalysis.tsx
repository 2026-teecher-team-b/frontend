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
import { useState, useRef, useEffect } from 'react'
import { useRagExplain } from '@/hooks/queries/useRagAnalysis'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Props {
  owner: string
  repo: string
}

const DEFAULT_QUESTION = '이 저장소에 대해 설명해주세요'
const TYPING_SPEED_MS = 14  // 글자 당 ms (빠를수록 빠르게)

export default function RAGAnalysis({ owner, repo }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null)
  const [displayedAnswer, setDisplayedAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data, isLoading, isError, error } = useRagExplain(
    owner || null,
    repo  || null,
    submittedQuestion,
  )

  // 타이핑 이펙트 — data가 바뀔 때마다 한 글자씩 표시
  useEffect(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    if (!data) { setDisplayedAnswer(''); return }
    let idx = 0
    setDisplayedAnswer('')
    typewriterRef.current = setInterval(() => {
      idx++
      setDisplayedAnswer(data.slice(0, idx))
      if (idx >= data.length) {
        clearInterval(typewriterRef.current!)
        typewriterRef.current = null
      }
    }, TYPING_SPEED_MS)
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current) }
  }, [data])

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
              flex-1 bg-black/60 border border-white/20 rounded-lg
              px-3 py-1.5 text-[11px] font-mono text-white/90
              placeholder:text-white/35
              focus:outline-none focus:border-blue-400/60 focus:bg-black/70
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
            ✕ 분석에 실패했습니다.
          </p>
          {/* 실제 에러 메시지 표시 — 디버깅용 */}
          {error && (
            <p className="text-[9px] text-red-300/50 font-mono mt-1 break-all leading-relaxed">
              {(error as Error & { response?: { status?: number; data?: unknown } }).response
                ? `HTTP ${(error as Error & { response?: { status?: number } }).response?.status} — ${
                    JSON.stringify((error as Error & { response?: { data?: unknown } }).response?.data)
                  }`
                : (error as Error).message}
            </p>
          )}
          <p className="text-[9px] text-white/20 font-mono mt-1.5">
            RAG 서버 상태 또는 저장소 데이터 수집 여부를 확인하세요.
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
          {/* 답변 — 타이핑 이펙트 */}
          <p className="text-[11px] text-white/70 font-mono leading-relaxed whitespace-pre-wrap">
            {displayedAnswer}
            {/* 타이핑 중일 때 커서 깜빡임 */}
            {displayedAnswer.length < (data?.length ?? 0) && (
              <span className="inline-block w-[2px] h-[12px] bg-blue-400 ml-0.5 align-middle animate-pulse" />
            )}
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
