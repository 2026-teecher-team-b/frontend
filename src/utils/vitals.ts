/**
 * vitals.ts — Web Vitals → Sentry 리포팅
 *
 * 측정 지표:
 *  - CLS  (Cumulative Layout Shift)   : 레이아웃 안정성
 *  - INP  (Interaction to Next Paint) : 클릭/키 반응성 (구 FID 대체)
 *  - LCP  (Largest Contentful Paint)  : 메인 콘텐츠 로드 속도
 *  - FCP  (First Contentful Paint)    : 첫 콘텐츠 표시 속도
 *  - TTFB (Time to First Byte)        : 서버 응답 속도
 *
 * Sentry Performance 탭 → Custom Measurements 에서 확인 가능.
 * 개발 환경(DEV)에서는 console.log로만 출력.
 */
import * as Sentry from '@sentry/react'
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'

function sendToSentry(metric: Metric) {
  if (import.meta.env.DEV) {
    // 개발 중에는 콘솔로 확인
    const color = metric.rating === 'good' ? '#4ade80' : metric.rating === 'needs-improvement' ? '#facc15' : '#f87171'
    console.log(`%c[Vitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`, `color: ${color}`)
    return
  }

  // 프로덕션 → Sentry Custom Measurement 전송
  // setMeasurement는 현재 활성 트랜잭션에 수치를 기록 (Sentry v8+)
  Sentry.setMeasurement(
    metric.name.toLowerCase(),
    metric.value,
    metric.name === 'CLS' ? '' : 'millisecond',
  )
}

export function reportWebVitals() {
  onCLS(sendToSentry)
  onINP(sendToSentry)
  onLCP(sendToSentry)
  onFCP(sendToSentry)
  onTTFB(sendToSentry)
}
