/** 1000 → 1k, 1000000 → 1M */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/** ISO 8601 → "3일 전" 형태 */
export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return '오늘'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}
