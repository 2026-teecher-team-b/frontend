import { Client } from '@stomp/stompjs'
import type { RepoScoreEvent } from '@/types/github'
import { useGalaxyStore } from '@/store/useGalaxyStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'

let stompClient: Client | null = null

export function connectWebSocket() {
  stompClient = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 5000,

    onConnect: () => {
      console.log('[WS] Connected')
      useGalaxyStore.getState().setConnected(true)

      // 실시간 점수 변화 구독
      stompClient?.subscribe('/topic/scores', (message) => {
        try {
          const event: RepoScoreEvent = JSON.parse(message.body)
          useGalaxyStore.getState().updateScore(event.repoId, event.score)
        } catch (e) {
          console.error('[WS] Parse error', e)
        }
      })
    },

    onDisconnect: () => {
      console.log('[WS] Disconnected')
      useGalaxyStore.getState().setConnected(false)
    },

    onStompError: (frame) => {
      console.error('[WS] STOMP error', frame)
    },
  })

  stompClient.activate()
}

export function disconnectWebSocket() {
  stompClient?.deactivate()
}
