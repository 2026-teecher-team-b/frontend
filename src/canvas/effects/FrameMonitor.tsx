/**
 * FrameMonitor.tsx — FPS 모니터 (DEV only)
 * rAF 기반으로 FPS를 측정하고 우하단에 표시.
 * setState 없이 DOM을 직접 조작 → 성능 측정에 영향 없음.
 */
import { useEffect, useRef } from 'react'

export default function FrameMonitor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let last = performance.now()
    let frames = 0
    let rafId = 0

    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        if (ref.current) ref.current.textContent = `${frames} fps`
        frames = 0
        last = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-16 right-4 z-10 text-[10px] font-mono text-white/20 pointer-events-none"
    />
  )
}
