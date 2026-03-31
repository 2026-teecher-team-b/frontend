import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { StarProps } from '@/types/canvas'
import { scoreToRadius, scoreToEmissiveIntensity } from '@/utils/physics'
import { useUIStore } from '@/store/useUIStore'

/** 언어별 색상 매핑 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
}

function getStarColor(language: string | null): string {
  if (!language) return '#ffffff'
  return LANGUAGE_COLORS[language] ?? '#aaaaaa'
}

export default function Star({
  repoId,
  name,
  position,
  activityScore,
  healthScore,
  language,
  isBlackHole = false,
  onClick,
}: StarProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const { selectRepo, setHovered: setGlobalHovered } = useUIStore()

  const radius = scoreToRadius(activityScore)
  const emissiveIntensity = scoreToEmissiveIntensity(healthScore)
  const color = isBlackHole ? '#000000' : getStarColor(language)

  // 미세한 자체 회전 (펄스 효과)
  useFrame((_, delta) => {
    if (meshRef.current && !isBlackHole) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        setGlobalHovered(repoId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        setGlobalHovered(null)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        selectRepo(repoId)
        onClick?.(repoId)
      }}
      scale={hovered ? 1.3 : 1}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={isBlackHole ? '#000000' : color}
        emissiveIntensity={hovered ? emissiveIntensity * 2 : emissiveIntensity}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  )
}
