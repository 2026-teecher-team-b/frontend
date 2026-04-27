/**
 * LoadingSpinner.tsx — 공통 로딩 스피너
 * Tailwind 애니메이션 기반, size prop으로 크기 조절 가능
 */

interface Props {
  size?: 'sm' | 'md' | 'lg'
  color?: string   // Tailwind color class (e.g. 'border-blue-400')
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export default function LoadingSpinner({ size = 'md', color = 'border-blue-400' }: Props) {
  return (
    <div
      className={`
        ${sizeMap[size]}
        ${color}
        rounded-full
        border-t-transparent
        animate-spin
      `}
      role="status"
      aria-label="로딩 중"
    />
  )
}
