/**
 * useScoreHistory.ts
 *
 * 저장소의 시계열 점수 데이터를 가져온다.
 * (GET /api/repos/{repoId}/scores?from=...&to=...)
 *
 * 반환된 ScoreHistoryEntry[] 배열은 ScoreChart 컴포넌트에서
 * 24시간 스파크라인 차트로 렌더링된다.
 *
 * [DEV 동작]
 *  - API 실패 시 현재 점수 기반으로 24개 모의 히스토리 생성
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/axios'
import type { ScoreHistoryEntry } from '@/types/github'
import { useGalaxyStore } from '@/store/useGalaxyStore'

// ── API 호출 ────────────────────────────────────────────────────────
async function fetchScoreHistory(
  repoId: number,
  from: string,
  to: string,
): Promise<ScoreHistoryEntry[]> {
  const { data } = await apiClient.get<ScoreHistoryEntry[]>(
    `/api/repos/${repoId}/scores`,
    { params: { from, to } },
  )
  return data
}

// ── 모의 데이터 생성 (BE 미준비 시) ──────────────────────────────────
function generateMockHistory(
  baseActivity: number,
  baseHealth: number,
  points = 24,
): ScoreHistoryEntry[] {
  const now = Date.now()
  return Array.from({ length: points }, (_, i) => {
    const bucket = new Date(now - (points - 1 - i) * 3600_000).toISOString()
    // 랜덤 워크로 자연스러운 변화
    const drift = (Math.random() - 0.5) * 14
    const activity = Math.max(0, Math.min(100, baseActivity + drift + (Math.random() - 0.5) * 8))
    const health   = Math.max(0, Math.min(100, baseHealth   + (Math.random() - 0.5) * 6))
    return {
      bucket,
      commitCount:    Math.round(Math.random() * 15),
      prCount:        Math.round(Math.random() * 5),
      issueCount:     Math.round(Math.random() * 8),
      releaseCount:   Math.random() < 0.05 ? 1 : 0,
      activeScore:    Math.round(activity),
      healthScore:    Math.round(health),
      brightnessScore: Math.round(activity * 0.8 + Math.random() * 10),
      sizeScore:      Math.round(activity * 0.6 + Math.random() * 15),
    }
  })
}

// ── Hook ────────────────────────────────────────────────────────────
export function useScoreHistory(repoId: number | null) {
  const score = useGalaxyStore((s) => (repoId ? s.scores[repoId] : undefined))
  const baseActivity = score?.activityScore ?? 50
  const baseHealth   = score?.healthScore   ?? 50

  return useQuery<ScoreHistoryEntry[]>({
    queryKey: ['scoreHistory', repoId],
    queryFn: async () => {
      if (!repoId) throw new Error('repoId is null')
      const to   = new Date().toISOString()
      const from = new Date(Date.now() - 24 * 3600_000).toISOString()
      try {
        return await fetchScoreHistory(repoId, from, to)
      } catch {
        if (import.meta.env.DEV) {
          await new Promise((r) => setTimeout(r, 200))
          return generateMockHistory(baseActivity, baseHealth)
        }
        throw new Error(`점수 히스토리를 불러오지 못했습니다. (id=${repoId})`)
      }
    },
    enabled: repoId !== null,
    staleTime: 1000 * 60 * 5, // 5분 캐시 (실시간성 고려)
  })
}
