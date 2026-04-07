/**
 * mockWebSocket.ts
 *
 * 개발 환경(DEV)에서 실제 WebSocket 없이도 실시간 점수 변화를 시뮬레이션한다.
 * BE API가 준비되면 App.tsx의 useMockWebSocket() 호출을 connectWebSocket()으로 교체한다.
 *
 * 시뮬레이션 동작:
 *  - 3~6초 간격으로 1~3개 저장소의 점수를 랜덤 변화
 *  - 가끔 트렌딩 급상승 이벤트 발생 (trendDelta > 15)
 *  - healthScore가 10 이하로 내려가면 블랙홀 판정
 */

import { useEffect } from 'react'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import type { RepoScore } from '@/types/github'

const BASE_INTERVAL_MS = 3000
const RANDOM_EXTRA_MS = 3000   // 3~6초 랜덤

export function useMockWebSocket() {
  const updateScore = useGalaxyStore((s) => s.updateScore)
  const repoCount = useGalaxyStore((s) => s.repositories.length)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (repoCount === 0) return

    console.log(`[MockWS] 개발 모드 실시간 시뮬레이션 시작 (${repoCount}개 저장소)`)

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      const state = useGalaxyStore.getState()
      const repos = state.repositories
      if (repos.length === 0) return

      // 1~3개 랜덤 선택
      const pickCount = Math.floor(Math.random() * 3) + 1
      const targets = [...repos]
        .sort(() => Math.random() - 0.5)
        .slice(0, pickCount)

      targets.forEach((repo) => {
        const current = state.scores[repo.id]
        const prevActivity = current?.activityScore ?? 50
        const prevHealth = current?.healthScore ?? 50

        // 트렌딩 이벤트: 10% 확률로 급상승
        const isTrending = Math.random() < 0.10
        const actDelta = isTrending
          ? Math.random() * 30 + 15        // +15 ~ +45
          : (Math.random() - 0.5) * 24     // -12 ~ +12

        const newActivity = Math.max(0, Math.min(100, prevActivity + actDelta))
        const newHealth   = Math.max(0, Math.min(100, prevHealth + (Math.random() - 0.5) * 8))

        const updated: RepoScore = {
          repoId: repo.id,
          activityScore: Math.round(newActivity),
          healthScore:   Math.round(newHealth),
          trendDelta:    Math.round(actDelta),
          updatedAt:     new Date().toISOString(),
        }

        if (isTrending) {
          console.log(`[MockWS] 🔥 트렌딩 급상승: ${repo.name} activity ${prevActivity} → ${updated.activityScore} (+${Math.round(actDelta)})`)
        } else {
          console.log(`[MockWS] 스코어 갱신: ${repo.name} activity=${updated.activityScore} health=${updated.healthScore}`)
        }

        updateScore(repo.id, updated)
      })

      // 다음 tick 예약
      const nextDelay = BASE_INTERVAL_MS + Math.random() * RANDOM_EXTRA_MS
      timeoutId = setTimeout(tick, nextDelay)
    }

    // 첫 tick
    timeoutId = setTimeout(tick, BASE_INTERVAL_MS)

    return () => {
      clearTimeout(timeoutId)
      console.log('[MockWS] 시뮬레이션 종료')
    }
  }, [repoCount, updateScore])
}
