/**
 * RAGAnalysis.tsx — RAG 기반 AI 분석 UI (7~8주차)
 *
 * 동작:
 *  1. "왜 트렌딩인가?" 버튼 클릭
 *  2. POST /api/rag/analyze 호출 (useRagAnalysis 훅)
 *  3. 로딩 중: 스피너 + 진행 메시지
 *  4. 완료: 분석 텍스트 + 출처 URL 목록 + 신뢰도 바
 */

import { useState } from 'react'
import { useRagAnalysis } from '@/hooks/queries/useRagAnalysis'
import type { RagAnalysisResponse } from '@/types/github'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Props {
  repoId: number
  repoName: string
}

// ── 신뢰도 → 색상 ────────────────────────────────────────────────────
function confidenceColor(c: number): string {
  if (c >= 0.85) return 'bg-green-500'
  if (c >= 0.65) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ── 마크다운 굵은글씨만 처리 ────────────────────────────────────────
function renderAnalysis(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    // 개행 처리
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 && <br />}</span>
    ))
  })
}

// ─────────────────────────────────────────────────────────────────────
export default function RAGAnalysis({ repoId, repoName }: Props) {
  const [result, setResult] = useState<RagAnalysisResponse | null>(null)
  const { mutate, isPending, error } = useRagAnalysis(repoName)

  const handleAnalyze = () => {
    setResult(null)
    mutate(
      { repoId, question: '이 저장소의 활동이 증가한 이유는 무엇인가요?' },
      { onSuccess: (data) => setResult(data) },
    )
  }

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">AI 분석</p>
        {result && (
          <button
            onClick={handleAnalyze}
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors font-mono underline"
          >
            재분석
          </button>
        )}
      </div>

      {/* 초기 상태: 버튼 */}
      {!result && !isPending && !error && (
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-150 group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🤔</span>
          <span className="text-xs font-mono text-white/60 group-hover:text-white/90">
            왜 트렌딩인가요?
          </span>
        </button>
      )}

      {/* 로딩 */}
      {isPending && (
        <div className="flex flex-col items-center gap-2.5 py-4">
          <LoadingSpinner size="md" color="border-purple-400" />
          <p className="text-[11px] text-white/40 font-mono animate-pulse">
            RAG 분석 중... 문서를 검색하고 있어요
          </p>
        </div>
      )}

      {/* 에러 */}
      {error && !isPending && (
        <div className="py-3 text-center">
          <p className="text-xs text-red-400 font-mono mb-2">{error.message}</p>
          <button
            onClick={handleAnalyze}
            className="text-[11px] text-white/40 hover:text-white/70 underline font-mono"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 분석 결과 */}
      {result && (
        <div className="space-y-3">
          {/* 분석 텍스트 */}
          <div className="text-[11px] font-mono text-white/65 leading-relaxed bg-white/3 rounded-lg px-3 py-2.5 border border-white/5">
            {renderAnalysis(result.analysis)}
          </div>

          {/* 신뢰도 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider">신뢰도</span>
              <span className="text-[9px] text-white/50 font-mono">{Math.round(result.confidence * 100)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${confidenceColor(result.confidence)}`}
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* 출처 */}
          {result.sources.length > 0 && (
            <div>
              <p className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-1.5">참고 출처</p>
              <ul className="space-y-1">
                {result.sources.slice(0, 3).map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400/70 hover:text-blue-300 font-mono truncate block underline-offset-2 hover:underline transition-colors"
                    >
                      {url.replace('https://', '')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 생성 시각 */}
          <p className="text-[9px] text-white/20 font-mono">
            생성: {new Date(result.generatedAt).toLocaleTimeString('ko-KR')}
          </p>
        </div>
      )}
    </div>
  )
}
