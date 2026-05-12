/**
 * LandingPage.tsx — GitHub Galaxy 소개 + 온보딩
 *
 * 첫 방문자에게만 표시 (localStorage "galaxy-visited" 기준)
 * "탐험 시작하기" 클릭 → 메인 3D 씬으로 진입
 */
import { useEffect, useRef } from 'react'

interface Props {
  onEnter: () => void
}

const FEATURES = [
  {
    icon: '🌌',
    title: '3D 은하 시각화',
    desc: '수백 개의 GitHub 저장소가 살아있는 별이 되어 웜홀 은하 속을 유영합니다.',
  },
  {
    icon: '⚡',
    title: '활동 기반 배치',
    desc: '활발한 저장소는 은하 상단에, 방치된 저장소는 블랙홀로 빨려들어갑니다.',
  },
  {
    icon: '🤖',
    title: 'AI 저장소 분석',
    desc: 'RAG 기반 AI가 저장소를 분석하고 자연어 질문에 답해줍니다.',
  },
  {
    icon: '⭐',
    title: '즐겨찾기 & 탐험',
    desc: '마음에 드는 저장소를 즐겨찾기에 추가하고 검색으로 빠르게 접근하세요.',
  },
]

export default function LandingPage({ onEnter }: Props) {
  // 배경 별 캔버스 ref
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 배경 별 애니메이션 (Canvas 2D — Three.js 없이)
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

    // 별 파티클 생성
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.7 + 0.1,
      speed: Math.random() * 0.18 + 0.04,
      phase: Math.random() * Math.PI * 2,
    }))

    let raf: number
    let t = 0

    const draw = () => {
      ctx.fillStyle = '#01020a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const s of stars) {
        const pulse = Math.sin(t * s.speed + s.phase) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(160, 180, 255, ${s.alpha * pulse})`
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
    <div className="relative w-full h-full overflow-hidden font-mono select-none">
      {/* ── 배경 별 캔버스 ─────────────────────────────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* ── 은하 중심 광원 글로우 ─────────────────────────────── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(40,80,200,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ── 메인 컨텐츠 ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">

        {/* ── 로고 / 타이틀 ────────────────────────────────────── */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 12px rgba(100,150,255,0.8))' }}>
            🌌
          </span>
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(100,160,255,0.5)' }}
          >
            GitHub Galaxy
          </h1>
        </div>

        {/* ── 서브타이틀 ─────────────────────────────────────── */}
        <p className="text-white/50 text-sm sm:text-base mb-10 max-w-md leading-relaxed">
          GitHub 저장소 생태계를 살아있는 3D 은하로 탐험하세요.
          <br className="hidden sm:block" />
          활동하는 별, 잠든 블랙홀, AI 분석까지.
        </p>

        {/* ── 기능 카드 그리드 ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-2xl w-full">
          {FEATURES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="
                bg-white/4 backdrop-blur-md
                border border-white/8 rounded-xl
                p-3 text-left
                hover:bg-white/7 hover:border-white/14
                transition-all duration-200
              "
            >
              <div className="text-xl mb-2">{icon}</div>
              <p className="text-white/80 text-[11px] font-bold mb-1 leading-tight">{title}</p>
              <p className="text-white/35 text-[10px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── CTA 버튼 ────────────────────────────────────────── */}
        <button
          onClick={onEnter}
          className="
            group relative
            px-8 py-3.5
            bg-blue-500/20 hover:bg-blue-500/30
            border border-blue-400/40 hover:border-blue-300/60
            rounded-2xl
            text-sm font-bold text-blue-200 hover:text-white
            transition-all duration-200
            shadow-[0_0_30px_rgba(80,130,255,0.2)] hover:shadow-[0_0_40px_rgba(80,130,255,0.35)]
          "
        >
          <span className="mr-2">🚀</span>
          은하 탐험 시작하기
          <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
        </button>

        {/* ── 조작 힌트 ────────────────────────────────────────── */}
        <p className="mt-5 text-white/20 text-[10px]">
          드래그로 회전 · 스크롤로 줌 · 별 클릭으로 상세보기
        </p>
      </div>

      {/* ── 하단 제작 크레딧 ─────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/15 text-[9px] z-10">
        2026 상반기 테커 프로젝트 B팀
      </div>
    </div>
  )
}
