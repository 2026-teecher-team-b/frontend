/**
 * LandingPage.tsx — GitHub Galaxy 온보딩 (HUD / Cyber 리디자인)
 */
import { useEffect, useRef, useState } from 'react'

interface Props {
  onEnter: () => void
}

const BOOT_LINES = [
  { label: '별 필드 렌더러',   status: '준비',  color: '#00d4ff' },
  { label: '저장소 매트릭스', status: '로드됨', color: '#00d4ff' },
  { label: '은하 물리 엔진',  status: '정상',  color: '#00ff88' },
  { label: 'AI RAG 엔진',     status: '대기',  color: '#ffaa00' },
]

const FEATURES = [
  {
    icon: '◈',
    title: '3D 별 시각화',
    desc: 'GitHub 저장소를 나선 은하의 살아있는 별로 렌더링합니다.',
  },
  {
    icon: '◈',
    title: '활동 기반 궤도',
    desc: '활발한 저장소는 은하 핵 가까이, 비활성은 외곽으로 이동합니다.',
  },
  {
    icon: '◈',
    title: 'AI 저장소 분석',
    desc: 'RAG 기반 AI가 모든 저장소에 대한 자연어 질문에 답합니다.',
  },
  {
    icon: '◈',
    title: '즐겨찾기 & 검색',
    desc: '저장소를 북마크하고 은하 전체에서 빠르게 검색하세요.',
  },
]

export default function LandingPage({ onEnter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bootPhase, setBootPhase] = useState(0)

  // Boot animation — stagger each status line
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i++
      setBootPhase(i)
      if (i >= BOOT_LINES.length) clearInterval(id)
    }, 260)
    return () => clearInterval(id)
  }, [])

  // Background star + grid canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 180 }, () => ({
      x:     Math.random(),
      y:     Math.random(),
      r:     Math.random() * 1.1 + 0.2,
      alpha: Math.random() * 0.45 + 0.08,
      speed: Math.random() * 0.14 + 0.03,
      phase: Math.random() * Math.PI * 2,
    }))

    let raf: number
    let t = 0

    const draw = () => {
      ctx.fillStyle = '#000a18'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid lines
      ctx.strokeStyle = 'rgba(0,212,255,0.028)'
      ctx.lineWidth = 1
      const g = 64
      for (let x = 0; x < canvas.width; x += g) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += g) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Stars
      for (const s of stars) {
        const pulse = Math.sin(t * s.speed + s.phase) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${(s.alpha * pulse * 0.65).toFixed(3)})`
        ctx.fill()
      }

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: '#000a18' }}
    >
      {/* Background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Scan-line overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.055) 2px, rgba(0,0,0,0.055) 4px)',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 58%, rgba(0,212,255,0.055) 0%, transparent 70%)',
        }}
      />

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">

        {/* ── Top badge ─────────────────────────────────────────── */}
        <div
          className="mb-6 flex items-center gap-2 text-[9px] tracking-[0.28em] uppercase"
          style={{ color: 'rgba(0,212,255,0.38)' }}
        >
          <span style={{ color: 'rgba(0,212,255,0.25)' }}>◈</span>
          <span>GITHUB.GALAXY</span>
          <span style={{ color: 'rgba(0,212,255,0.18)' }}>//</span>
          <span style={{ color: 'rgba(0,212,255,0.28)' }}>WEBGL COMMAND v1.0</span>
          <span style={{ color: 'rgba(0,212,255,0.25)' }}>◈</span>
        </div>

        {/* ── Title ─────────────────────────────────────────────── */}
        <h1
          className="text-4xl sm:text-5xl font-black tracking-[-0.01em] text-white mb-1.5"
          style={{ textShadow: '0 0 40px rgba(0,212,255,0.32), 0 0 80px rgba(0,212,255,0.1)' }}
        >
          깃허브 갤럭시
        </h1>
        <p
          className="text-[10px] tracking-[0.3em] mb-8"
          style={{ color: 'rgba(0,212,255,0.38)' }}
        >
          오픈소스 저장소 은하 탐험
        </p>

        {/* ── Boot sequence panel ───────────────────────────────── */}
        <div className="mb-7 w-full max-w-sm">
          <div
            className="relative px-3.5 py-2.5"
            style={{
              background: 'rgba(0,10,24,0.82)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.55)' }} />

            <p
              className="text-[9px] tracking-[0.22em] uppercase mb-2.5"
              style={{ color: 'rgba(0,212,255,0.38)' }}
            >
              ▸ SYSTEM STATUS
            </p>
            <ul className="space-y-1.5">
              {BOOT_LINES.map((line, i) => (
                <li
                  key={line.label}
                  className="flex items-center justify-between text-[10px] transition-opacity duration-200"
                  style={{ opacity: i < bootPhase ? 1 : 0 }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.38)' }}>{line.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: line.color,
                        boxShadow: `0 0 6px ${line.color}`,
                      }}
                    />
                    <span
                      className="text-[9px] tracking-widest"
                      style={{ color: line.color }}
                    >
                      {line.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Feature grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 w-full max-w-2xl">
          {FEATURES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="relative p-3 text-left transition-all duration-200 group"
              style={{
                background: 'rgba(0,13,32,0.60)',
                border: '1px solid rgba(0,212,255,0.10)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor =
                  'rgba(0,212,255,0.26)'
                ;(e.currentTarget as HTMLDivElement).style.background =
                  'rgba(0,13,32,0.82)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor =
                  'rgba(0,212,255,0.10)'
                ;(e.currentTarget as HTMLDivElement).style.background =
                  'rgba(0,13,32,0.60)'
              }}
            >
              {/* Micro corner brackets */}
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: 'rgba(0,212,255,0.40)' }} />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: 'rgba(0,212,255,0.40)' }} />

              <p className="text-lg mb-1.5" style={{ color: 'rgba(0,212,255,0.50)' }}>{icon}</p>
              <p
                className="text-[9px] font-bold tracking-widest uppercase mb-1"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {title}
              </p>
              <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── CTA button ────────────────────────────────────────── */}
        <button
          onClick={onEnter}
          className="relative px-10 py-3 font-bold uppercase tracking-[0.22em] text-sm transition-all duration-200"
          style={{
            color: '#00d4ff',
            border: '1px solid rgba(0,212,255,0.40)',
            background: 'rgba(0,212,255,0.05)',
            boxShadow: '0 0 24px rgba(0,212,255,0.08)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#ffffff'
            el.style.borderColor = 'rgba(0,212,255,0.72)'
            el.style.background = 'rgba(0,212,255,0.10)'
            el.style.boxShadow = '0 0 32px rgba(0,212,255,0.18), inset 0 0 20px rgba(0,212,255,0.04)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = '#00d4ff'
            el.style.borderColor = 'rgba(0,212,255,0.40)'
            el.style.background = 'rgba(0,212,255,0.05)'
            el.style.boxShadow = '0 0 24px rgba(0,212,255,0.08)'
          }}
        >
          {/* Button corner brackets */}
          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: 'rgba(0,212,255,0.65)' }} />
          <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: 'rgba(0,212,255,0.65)' }} />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: 'rgba(0,212,255,0.65)' }} />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: 'rgba(0,212,255,0.65)' }} />
          ▶ 탐험 시작
        </button>

        {/* Navigation hint */}
        <p
          className="mt-5 text-[9px] tracking-[0.22em] uppercase"
          style={{ color: 'rgba(0,212,255,0.20)' }}
        >
          드래그 회전 · 스크롤 줌 · 별 클릭으로 정보 확인
        </p>
      </div>

      {/* ── Footer credit ─────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] z-10 tracking-widest uppercase"
        style={{ color: 'rgba(0,212,255,0.14)' }}
      >
        2026 TECHEER PROJECT B-TEAM
      </div>
    </div>
  )
}
