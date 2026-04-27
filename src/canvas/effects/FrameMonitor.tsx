/**
 * FrameMonitor.tsx — FPS 모니터 (DEV 전용)
 *
 * Canvas 외부에 배치하는 순수 React 컴포넌트.
 * requestAnimationFrame 루프로 FPS를 측정하고
 * 1초마다 DOM을 직접 업데이트 (setState 없음 → 리렌더 최소화).
 *
 * PROD 빌드에서는 아무것도 렌더하지 않는다.
 */

import { useEffect, useRef } from 'react'

export default function FrameMonitor() {
  const domRef    = useRef<HTMLDivElement>(null)
  const frameRef  = useRef(0)
  const lastRef   = useRef(performance.now())

  useEffect(() => {
    if (!import.meta.env.DEV) return

    let rafId: number

    const loop = () => {
      frameRef.current++
      const now = performance.now()
      const elapsed = now - lastRef.current

      if (elapsed >= 1000) {
        const fps = Math.round(frameRef.current * 1000 / elapsed)
        if (domRef.current) {
          domRef.current.textContent = `${fps} FPS`
          // FPS에 따라 색상 변화
          domRef.current.style.color =
            fps >= 55 ? 'rgba(100,255,150,0.5)' :
            fps >= 30 ? 'rgba(255,220,80,0.5)'  :
                        'rgba(255,80,80,0.5)'
        }
        frameRef.current = 0
        lastRef.current  = now
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <div
      ref={domRef}
      className="absolute bottom-4 right-4 text-[11px] font-mono pointer-events-none"
      style={{ color: 'rgba(100,255,150,0.5)' }}
    >
      -- FPS
    </div>
  )
}
