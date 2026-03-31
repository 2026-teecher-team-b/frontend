import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars as DreiStars, Preload } from '@react-three/drei'
import Star from './objects/Star'
import { useGalaxyStore } from '@/store/useGalaxyStore'

function StarField() {
  const stars = useGalaxyStore((s) => s.stars)

  return (
    <>
      {stars.map((star) => (
        <Star key={star.repoId} {...star} />
      ))}
    </>
  )
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 150], fov: 60, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#030712' }}
    >
      {/* 조명 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={1.5} />
      <pointLight position={[-100, -100, -100]} intensity={0.5} color="#4060ff" />

      {/* @react-three/drei 제공 배경 별 파티클 */}
      <DreiStars
        radius={500}
        depth={60}
        count={8000}
        factor={4}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* 실제 저장소 별들 */}
      <Suspense fallback={null}>
        <StarField />
        <Preload all />
      </Suspense>

      {/* 마우스로 카메라 회전/줌 */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        zoomSpeed={0.8}
        minDistance={20}
        maxDistance={800}
        autoRotate
        autoRotateSpeed={0.15}
      />
    </Canvas>
  )
}
