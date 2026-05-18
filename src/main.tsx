import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { reportWebVitals } from '@/utils/vitals'

// ── Sentry 초기화 ────────────────────────────────────────────────────
// DSN이 없으면(로컬 개발 등) 초기화 생략 — 에러 발생하지 않음
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // 프로덕션에서만 활성화
  enabled: import.meta.env.PROD,

  // 트레이스 샘플링: 전체 요청의 10% 만 성능 트레이스 수집
  // (무료 티어 쿼터 초과 방지 — 나중에 올려도 됨)
  tracesSampleRate: 0.1,

  // 릴리즈 버전 — Sentry 대시보드에서 배포별 에러 추적 가능
  release: import.meta.env.VITE_APP_VERSION ?? 'dev',

  // 환경 구분
  environment: import.meta.env.MODE,

  // 콘솔 에러도 Sentry에 브레드크럼으로 기록
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // 에러 세션의 100%, 일반 세션의 10% 녹화
      maskAllText:     false,   // 텍스트 마스킹 끔 (민감 정보 없으므로)
      blockAllMedia:   false,
      sessionSampleRate:      0.1,
      errorSampleRate:        1.0,
    }),
  ],
})

// ── React Query 클라이언트 ────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5분 — REST 조회 캐시
      retry: 1,
    },
  },
})

// ── 앱 마운트 ────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 최상위 에러 바운더리 — 어디서든 에러 나도 앱 전체 죽지 않음 */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Web Vitals 수집 시작 (CLS, INP, LCP, FCP, TTFB)
reportWebVitals()
