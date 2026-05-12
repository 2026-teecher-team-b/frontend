/**
 * Scene.tsx — 3D 씬 최상위  v3 (Wormhole)
 *
 * 포함 요소:
 *  - 조명 (ambient + wormhole 테마 3점 조명)
 *  - 배경 은하 파티클 (drei Stars)
 *  - WormholeFunnel  : 깔때기 격자 + 빛 고리
 *  - StarConnections : 같은 언어 별 사이 연결선
 *  - Star × 1000     : 저장소 별 (깔때기 물리 적용)
 *  - MeteorEffect    : 유성 이펙트
 *  - SpaceControls   : 드래그 탐험 카메라
 *  - usePhysics      : 깔때기 물리 루프
 *
 * v3 변경:
 *  - Cluster 제거 (깔때기 구조에서 언어별 성단 불필요)
 *  - WormholeFunnel, StarConnections 추가
 *  - 조명 색상 → 차갑고 깊은 우주 톤 (파랑/보라)
 */

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars as DreiStars, Preload } from '@react-three/drei'
import InstancedStarField from './objects/InstancedStarField'
import WormholeFunnel from './objects/WormholeFunnel'
import StarConnections from './objects/StarConnections'
import InfiniteGrid from './objects/InfiniteGrid'
import MeteorEffect from './effects/MeteorEffect'
import SpaceControls, { wasPointerDrag } from './controls/SpaceControls'
import { useUIStore } from '@/store/useUIStore'
import { usePhysics } from '@/hooks/3d/usePhysics'

// ── GalaxyScene — Canvas 내부 ────────────────────────────────────
function GalaxyScene() {
  usePhysics()

  return (
    <>
      {/* ── 조명 ──────────────────────────────────────────────── */}
      {/* ambient: 아주 어두운 심우주 톤 */}
      <ambientLight intensity={0.12} />
      {/* 메인 포인트: 깔때기 중앙 위에서 아래로 */}
      <pointLight position={[0, 200, 0]}       intensity={1.8} color="#88bbff" />
      {/* 보조 1: 왼쪽 아래 — 차가운 파란빛 */}
      <pointLight position={[-200, -80, 50]}   intensity={0.6} color="#2244aa" />
      {/* 보조 2: 오른쪽 — 약한 보라 */}
      <pointLight position={[ 180, 60, -80]}   intensity={0.4} color="#6622aa" />
      {/* 목(throat) 조명: 붉은 빛 */}
      <pointLight position={[0, -160, 0]}      intensity={1.2} color="#ff3300" distance={120} decay={2} />

      {/* ── 배경 은하 파티클 ──────────────────────────────────── */}
      <DreiStars
        radius={1200}
        depth={180}
        count={14000}
        factor={3}
        saturation={0.06}
        fade
        speed={0.05}
      />

      {/* ── 깔때기 구조물 ─────────────────────────────────────── */}
      <WormholeFunnel />

      {/* ── 상단 무한 격자 ────────────────────────────────────── */}
      <InfiniteGrid />

      {/* ── 별 사이 연결선 ────────────────────────────────────── */}
      <StarConnections />

      {/* ── 저장소 별 (InstancedMesh — draw call 1회로 수만 개 처리) ── */}
      <Suspense fallback={null}>
        <InstancedStarField />
        <Preload all />
      </Suspense>

      {/* ── 유성 이펙트 ───────────────────────────────────────── */}
      <MeteorEffect />

      {/* ── 우주 탐험 카메라 ──────────────────────────────────── */}
      <SpaceControls />
    </>
  )
}

// ── Canvas 래퍼 ────────────────────────────────────────────────────
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [280, 60, 0], fov: 58, near: 0.1, far: 3000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#01020a' }}
      frameloop="always"
      onPointerMissed={() => {
        // 드래그 직후엔 패널 닫지 않음 (회전 후 의도치 않은 닫힘 방지)
        if (!wasPointerDrag()) useUIStore.getState().closePanel()
      }}
    >
      <GalaxyScene />
    </Canvas>
  )
}
