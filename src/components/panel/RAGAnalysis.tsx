/**
 * RAGAnalysis.tsx — AI "왜 트렌딩?" 분석 패널
 */
import { useState } from 'react'
import { useRagAnalysis } from '@/hooks/queries/useRagAnalysis'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function RAGAnalysis({ repoId }: { repoId: number }) {
  const [triggered, setTriggered] = useState(false)
  const { mutate, data, isPending, isError } = useRagAnalysis()

  const handleAnalyze = () => {
    setTriggered(true)
    mutate(repoId)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">AI 분석</span>
        {!triggered && (
          <button
            onClick={handleAnalyze}
            className="text-[10px] font-mono text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-300/50 px-2 py-0.5 rounded transition-all"
          >
            왜 트렌딩?
          </button>
        )}
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
          <LoadingSpinner size={12} />
          <span>분석 중…</span>
        </div>
      )}

      {isError && (
        <p className="text-[10px] text-red-400/70 font-mono">분석 실패. 백엔드 연결을 확인하세요.</p>
      )}

      {data?.analysis && (
        <p className="text-[11px] text-white/60 font-mono leading-relaxed whitespace-pre-wrap">
          {data.analysis}
        </p>
      )}
    </div>
  )
}
