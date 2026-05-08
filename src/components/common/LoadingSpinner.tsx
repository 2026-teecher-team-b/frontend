export default function LoadingSpinner({ size = 16 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-white/10 border-t-blue-400"
      style={{ width: size, height: size }}
    />
  )
}
