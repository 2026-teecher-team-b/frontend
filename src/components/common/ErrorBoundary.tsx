/**
 * ErrorBoundary.tsx — React 에러 바운더리
 *
 * Canvas(WebGL) 또는 컴포넌트 에러 발생 시 전체 화면 화이트스크린 대신
 * 안내 화면을 표시한다. Sentry.ErrorBoundary 래핑으로 에러를 자동 수집한다.
 *
 * 사용:
 *   <ErrorBoundary fallback={<MyFallback />}>
 *     <Scene />
 *   </ErrorBoundary>
 */
import * as Sentry from '@sentry/react'

interface Props {
  children: React.ReactNode
  /** 에러 발생 시 표시할 대체 UI. 없으면 기본 안내 화면 */
  fallback?: React.ReactNode
}

function DefaultFallback() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#01020a] text-white/60 font-mono gap-4">
      <span className="text-4xl">🌌</span>
      <p className="text-sm">은하에서 오류가 발생했습니다.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 text-xs border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
      >
        새로고침
      </button>
    </div>
  )
}

export default function ErrorBoundary({ children, fallback }: Props) {
  return (
    <Sentry.ErrorBoundary fallback={fallback ?? <DefaultFallback />}>
      {children}
    </Sentry.ErrorBoundary>
  )
}
