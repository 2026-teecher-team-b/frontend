/**
 * useInterval — 일정 간격으로 콜백을 반복 실행하는 훅
 *
 * 사용 예:
 *   useInterval(() => fetchData(), 5 * 60 * 1000)  // 5분마다 실행
 *
 * - delay=null 이면 타이머 정지 (일시 중단 용도)
 * - React StrictMode 이중 실행에도 안전 (cleanup이 항상 이전 interval을 정리)
 */

import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // 최신 콜백을 ref에 저장 (클로저 구식화 방지)
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
