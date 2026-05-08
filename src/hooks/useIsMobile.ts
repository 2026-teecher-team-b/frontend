/**
 * useIsMobile — 화면 너비 기반 모바일 여부 감지 훅
 *
 * 기본 breakpoint: 768px (md)
 * - 768px 미만 → true (모바일/태블릿 세로)
 * - 768px 이상 → false (태블릿 가로/데스크톱)
 *
 * SSR 환경에서는 false 반환 (hydration mismatch 방지)
 */
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
