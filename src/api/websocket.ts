/**
 * websocket.ts — WebSocket 미사용 (스케줄러 기반 아키텍처로 전환)
 *
 * 이 시스템은 GitHub 데이터를 10~30분 간격 스케줄러로 수집하며,
 * 그 주기보다 빠른 WebSocket 푸시는 실질적 의미가 없습니다.
 * 대신 App.tsx에서 5분 간격 폴링으로 최신 데이터를 갱신합니다.
 *
 * WebSocket 재도입이 필요해지면 (예: 이벤트 기반 Webhook 아키텍처 전환 시)
 * 이 파일에 connectWebSocket / disconnectWebSocket 을 구현하세요.
 */

export {}
