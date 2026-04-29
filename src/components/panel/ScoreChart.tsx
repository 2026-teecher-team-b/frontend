/**
 * ScoreChart.tsx — 24시간 점수 SVG 스파크라인
 */
import { useMemo } from 'react'
import type { RepoScore } from '@/types/github'

interface Props {
  scores: RepoScore[]
  width?: number
  height?: number
}

export default function ScoreChart({ scores, width = 260, height = 52 }: Props) {
  const points = useMemo(() => {
    if (scores.length < 2) return ''
    const vals  = scores.map((s) => s.activityScore)
    const min   = Math.min(...vals)
    const max   = Math.max(...vals)
    const range = Math.max(max - min, 1)
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * width
        const y = height - ((v - min) / range) * (height - 8) - 4
        return `${x},${y}`
      })
      .join(' ')
  }, [scores, width, height])

  if (scores.length < 2) {
    return <p className="text-[10px] text-white/30 font-mono">데이터 없음</p>
  }

  const last   = scores[scores.length - 1]
  const prev   = scores[scores.length - 2]
  const delta  = last.activityScore - prev.activityScore
  const color  = delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#94a3b8'

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] text-white/30 font-mono">활동 점수 (24h)</span>
        <span className="text-[10px] font-mono" style={{ color }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(0)}
        </span>
      </div>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4f8ef7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="#4f8ef7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
