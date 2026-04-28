/**
 * Scene.tsx — 3D 씬 최상위
 *
 * 포함 요소:
 *  - 조명 (ambient + 3점 조명)
 *  - 배경 성운 파티클 (drei Stars)
 *  - Cluster 컴포넌트 × 언어 수 (Sparkles 성단 + glow + 라벨)
 *  - Star 컴포넌트 × 50개 (저장소 별)
 *  - MeteorEffect (유성 이펙트)
 *  - SpaceControls (드래그 탐험 카메라)
 *  - usePhysics (N-body 시뮬레이션 — 이 컴포넌트 안에서 한 번 호출)
 *
 * 프레임 최적화:
 *  - usePhysics: 2프레임당 1회 물리 계산
 *  - Star: physicsStore → mesh.position 직접 변경 (React 리렌더 없음)
 *  - Cluster: getDriftingCenter로 group.position 직접 변경
 *  - MeteorEffect: ref + 직접 DOM 변경
 *  - FrameMonitor: rAF 기반, setState 없음
 */

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars as DreiStars, Preload } from '@react-three/drei'
import Star from './objects/Star'
//import Cluster from './objects/Cluster'
//import MeteorEffect from './effects/MeteorEffect'
import SpaceControls from './controls/SpaceControls'
import { useGalaxyStore } from '@/store/useGalaxyStore'
//import { usePhysics } from '@/hooks/3d/usePhysics'

// ── Physics + Stars + Clusters — Canvas 내부 컴포넌트 ─────────────
function GalaxyScene() {
  // N-body 물리 시뮬레이션 (Canvas 내부에서 useFrame 사용)
  //usePhysics()

  const stars = useGalaxyStore((s) => s.stars)

  // 언어별 클러스터 그룹 도출
  const clusters = useMemo(() => {
    const map = new Map<string, number>() // language → star count
    stars.forEach((s) => {
      const lang = s.language ?? 'Unknown'
      map.set(lang, (map.get(lang) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([language, count]) => ({
      language,
      count,
    }))
  }, [stars])

  return (
    <>
      {/* ── 조명 ──────────────────────────────────────────────────── */}
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 0, 200]}   intensity={1.0} />
      <pointLight position={[-160, 130, -60]} intensity={0.5} color="#223366" />
      <pointLight position={[ 160, -130, -60]} intensity={0.3} color="#661122" />

      {/* ── 배경 은하 파티클 ────────────────────────────────────────── */}
      <DreiStars
        radius={900}
        depth={120}
        count={12000}
        factor={3}
        saturation={0.08}
        fade
        speed={0.08}
      />

      {/* ── 성단(Cluster) 시각화 — 언어별 1개 ──────────────────────── */}
      {/*clusters.map(({ language, count }) => (
        <Cluster key={language} language={language} starCount={count} />
      ))*/}

      {/* ── 저장소 별 ─────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        {stars.map((star) => (
          <Star key={star.repoId} {...star} />
        ))}
        <Preload all />
      </Suspense>

      {/* ── 유성 이펙트 ───────────────────────────────────────────── */}
      {/* <MeteorEffect /> */}

      {/* ── 우주 탐험 카메라 ─────────────────────────────────────── */}
      <SpaceControls />
    </>
  )
}

// ── Canvas 래퍼 ────────────────────────────────────────────────────
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 60, near: 0.1, far: 2500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#020408' }}
      // frameloop: always → 물리 애니메이션을 위해 항상 렌더
      frameloop="always"
    >
      <GalaxyScene />
    </Canvas>
  )
}
