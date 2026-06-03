/**
 * LandingPage.tsx — 깃허브 갤럭시 온보딩
 *
 * 별이 흐르는 배경 위에 간결한 히어로 + 핵심 소개 + 진입 CTA.
 */
import { useEffect, useRef } from 'react'

interface Props {
  onEnter: () => void
}

const HIGHLIGHTS = [
  {
    symbol: '★',
    title: '활동이 곧 밝기',
    desc: '커밋·PR·이슈가 활발한 저장소일수록 더 밝고 큰 별로 빛납니다.',
  },
  {
    symbol: '◐',
    title: '은하 속 궤도',
    desc: '활발한 저장소는 은하 중심으로, 잠든 저장소는 외곽으로 흩어집니다.',
  },
  {
    symbol: '✦',
    title: 'AI에게 묻기',
    desc: '저장소 문서를 학습한 AI가 “무엇을 하는 프로젝트인지” 답해줍니다.',
  },
]

export default function LandingPage({ onEnter }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 흐르는 별 배경
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.14 + 0.02,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.18 ? 'warm' : 'cool',
    }))

    let raf: number
    let t = 0

    const draw = () => {
      // 깊은 우주 그라데이션
      const g = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.62, 0,
        canvas.width * 0.5, canvas.height * 0.62, canvas.height * 0.9,
      )
      g.addColorStop(0, '#0a1430')
      g.addColorStop(0.5, '#050a1c')
      g.addColorStop(1, '#02040d')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const s of stars) {
        const pulse = Math.sin(t * s.speed + s.phase) * 0.35 + 0.65
        const a = (s.alpha * pulse).toFixed(3)
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle =
          s.hue === 'warm'
            ? `rgba(255,210,150,${a})`
            : `rgba(150,210,255,${a})`
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
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: '#02040d' }}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* 중심부 은은한 발광 */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(80,160,255,0.10) 0%, transparent 65%)',
        }}
      />

      {/* ── 본문 ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        {/* 키커 */}
        <p className="mb-5 text-sm tracking-[0.2em]" style={{ color: 'rgba(150,200,255,0.55)' }}>
          오픈소스 우주를 여행하는 또 다른 방법
        </p>

        {/* 타이틀 */}
        <h1
          className="text-6xl sm:text-7xl font-black tracking-tight text-white mb-5"
          style={{ textShadow: '0 0 60px rgba(90,160,255,0.35)' }}
        >
          GitHub Galaxy
        </h1>

        {/* 서브 카피 */}
        <p
          className="max-w-xl text-base sm:text-lg leading-relaxed mb-12"
          style={{ color: 'rgba(255,255,255,0.62)' }}
        >
          수천 개의 GitHub 저장소를 하나의 은하로 펼쳤습니다.
          별 하나하나가 살아있는 프로젝트예요.
          마음에 드는 별을 골라 활동과 트렌드, AI 분석까지 들여다보세요.
        </p>

        {/* 하이라이트 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8 mb-14 w-full max-w-3xl">
          {HIGHLIGHTS.map(({ symbol, title, desc }) => (
            <div key={title} className="text-center sm:text-left">
              <div className="text-2xl mb-2" style={{ color: 'rgba(130,195,255,0.85)' }}>
                {symbol}
              </div>
              <p className="text-[15px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {title}
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onEnter}
          className="group relative px-12 py-4 rounded-full font-bold text-base tracking-wide transition-all duration-200"
          style={{
            color: '#04060f',
            background: 'linear-gradient(135deg, #9fd2ff 0%, #5aa0ff 100%)',
            boxShadow: '0 0 40px rgba(90,160,255,0.35)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.boxShadow = '0 0 56px rgba(90,160,255,0.55)'
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.boxShadow = '0 0 40px rgba(90,160,255,0.35)'
            el.style.transform = 'translateY(0)'
          }}
        >
          은하 탐험 시작하기 →
        </button>

        {/* 조작 힌트 */}
        <p className="mt-7 text-[13px]" style={{ color: 'rgba(150,200,255,0.35)' }}>
          드래그로 회전 · 스크롤로 확대 · 별을 클릭하면 자세히
        </p>
      </div>

      {/* 푸터 */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] z-10 tracking-wide"
        style={{ color: 'rgba(150,200,255,0.22)' }}
      >
        2026 Techeer Project · B Team
      </div>
    </div>
  )
}
