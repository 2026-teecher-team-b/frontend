/**
 * ScoreChart.tsx — 점수 타임라인 SVG 스파크라인 차트
 *
 * 외부 라이브러리 없이 순수 SVG로 구현.
 * useScoreHistory 훅에서 받아온 24시간 데이터를 시각화.
 *
 * 두 라인:
 *  - 파란선: activeScore (활동 지수)
 *  - 초록선: healthScore (건강 지수)
 */

import { useMemo } from 'react'
import type { ScoreHistoryEntry } from '@/types/github'

interface Props {
  data: ScoreHistoryEntry[]
  height?: number
}

const W = 260
const PADDING = { top: 4, right: 4, bottom: 18, left: 24 }

function buildPath(
  data: ScoreHistoryEntry[],
  valueKey: 'activeScore' | 'healthScore',
  chartW: number,
  chartH: number,
): string {
  if (data.length < 2) return ''
  return data
    .map((entry, i) => {
      const x = (i / (data.length - 1)) * chartW
      const y = chartH - (entry[valueKey] / 100) * chartH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildArea(
  data: ScoreHistoryEntry[],
  valueKey: 'activeScore' | 'healthScore',
  chartW: number,
  chartH: number,
): string {
  if (data.length < 2) return ''
  const linePts = data.map((entry, i) => {
    const x = (i / (data.length - 1)) * chartW
    const y = chartH - (entry[valueKey] / 100) * chartH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M${linePts[0]} L${linePts.join(' L')} L${chartW},${chartH} L0,${chartH} Z`
}

// 시각 포맷: 0~23 → "0h" ~ "23h"
function bucketLabel(iso: string): string {
  const h = new Date(iso).getHours()
  return `${h}h`
}

export default function ScoreChart({ data, height = 80 }: Props) {
  const chartW = W - PADDING.left - PADDING.right
  const chartH = height - PADDING.top - PADDING.bottom

  const activityPath = useMemo(() => buildPath(data, 'activeScore', chartW, chartH), [data, chartW, chartH])
  const healthPath   = useMemo(() => buildPath(data, 'healthScore', chartW, chartH), [data, chartW, chartH])
  const activityArea = useMemo(() => buildArea(data, 'activeScore', chartW, chartH), [data, chartW, chartH])

  // X 축 레이블: 6시간 간격
  const xLabels = useMemo(() => {
    if (data.length === 0) return []
    const step = Math.floor(data.length / 4)
    return [0, step, step * 2, step * 3, data.length - 1].map((i) => ({
      x: (i / (data.length - 1)) * chartW,
      label: bucketLabel(data[i]?.bucket ?? ''),
    }))
  }, [data, chartW])

  // 현재 마지막 값
  const last = data[data.length - 1]

  if (data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-white/25 text-xs font-mono">
        데이터 없음
      </div>
    )
  }

  return (
    <div>
      <svg
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        className="w-full overflow-visible"
      >
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={0} y={0} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {/* Y 축 가이드라인 */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = chartH - (v / 100) * chartH
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                <text x={-4} y={y + 3.5} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={8} fontFamily="monospace">
                  {v}
                </text>
              </g>
            )
          })}

          {/* 활동 지수 영역 */}
          <path d={activityArea} fill="url(#actGrad)" clipPath="url(#chartClip)" />

          {/* 활동 지수 라인 */}
          <path
            d={activityPath}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#chartClip)"
          />

          {/* 건강 지수 라인 */}
          <path
            d={healthPath}
            fill="none"
            stroke="#34d399"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 2"
            clipPath="url(#chartClip)"
          />

          {/* X 축 레이블 */}
          {xLabels.map(({ x, label }) => (
            <text
              key={label}
              x={x}
              y={chartH + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.25)"
              fontSize={8}
              fontFamily="monospace"
            >
              {label}
            </text>
          ))}
        </g>
      </svg>

      {/* 범례 */}
      <div className="flex gap-4 mt-1 text-[10px] font-mono text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-3 h-px bg-blue-400 inline-block" />
          활동 {last ? last.activeScore : '--'}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-px bg-emerald-400 inline-block" style={{ borderTop: '1px dashed' }} />
          건강 {last ? last.healthScore : '--'}
        </span>
      </div>
    </div>
  )
}
