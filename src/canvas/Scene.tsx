/**
 * Scene.tsx — 3D 씬 최상위  v4 (Galaxy Disc)
 *
 * 포함 요소:
 *  - 조명 (ambient + 은하 테마 3점 조명)
 *  - 배경 은하 파티클 (drei Stars)
 *  - GalaxyCore   : 은하 핵 + 동심원 링 + 나선팔 가이드
 *  - GalaxyGrid   : 갈락틱 평면 격자 (Y=0)
 *  - StarConnections : 같은 언어 별 사이 연결선
 *  - InstancedStarField : 저장소 별 (은하 물리 적용)
 *  - MeteorEffect  : 유성 이펙트
 *  - SpaceControls : 드래그 탐험 카메라 (2D/3D 뷰 모드 지원)
 *  - usePhysics    : 은하 물리 루프
 *
 * v4 변경:
 *  - WormholeFunnel → GalaxyCore (은하 핵)
 *  - InfiniteGrid → 갈락틱 평면 격자 (Y=0)
 *  - 카메라 시작 위치 → [0, 150, 280] (은하 디스크 3/4 각도 뷰)
 *  - 조명 → 따뜻한 코어 중심 + 차가운 외곽
 */

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars as DreiStars, Preload } from '@react-three/drei'
import * as THREE from 'three'
import InstancedStarField from './objects/InstancedStarField'
import GalaxyCore from './objects/GalaxyCore'
import StarConnections from './objects/StarConnections'
import MeteorEffect from './effects/MeteorEffect'
import SpaceControls, { wasPointerDrag } from './controls/SpaceControls'
import { useUIStore } from '@/store/useUIStore'
import { usePhysics } from '@/hooks/3d/usePhysics'

// ── 갈락틱 평면 격자 (인라인 컴포넌트) ──────────────────────────────
function GalaxyGrid() {
  const bigGrid = useMemo(() => {
    const helper = new THREE.GridHelper(4000, 80, 0x061828, 0x030d18)
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material]
    mats.forEach((m) => {
      m.transparent = true
      m.opacity     = 0.18
      m.depthWrite  = false
      ;(m as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    })
    return helper
  }, [])

  const midGrid = useMemo(() => {
    const helper = new THREE.GridHelper(800, 80, 0x0a2a4a, 0x061828)
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material]
    mats.forEach((m) => {
      m.transparent = true
      m.opacity     = 0.12
      m.depthWrite  = false
      ;(m as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    })
    return helper
  }, [])

  return (
    <>
      <primitive object={bigGrid} />
      <primitive object={midGrid} />
    </>
  )
}

// ── GalaxyScene — Canvas 내부 ────────────────────────────────────
function GalaxyScene() {
  usePhysics()

  return (
    <>
      {/* ── 조명 ──────────────────────────────────────────────── */}
      {/* ambient: 아주 어두운 심우주 톤 */}
      <ambientLight intensity={0.10} />
      {/* 코어 메인 포인트: 은하 중심에서 따뜻한 황금빛 */}
      <pointLight position={[0, 80, 0]}        intensity={2.2} color="#ffcc66" distance={300} decay={1.5} />
      {/* 코어 보조: 아래쪽에서 은은한 오렌지 */}
      <pointLight position={[0, -60, 0]}       intensity={0.8} color="#ff8800" distance={200} decay={2} />
      {/* 외곽 좌측: 차가운 파랑 (나선팔 조명) */}
      <pointLight position={[-250, 30, 80]}    intensity={0.45} color="#2244aa" />
      {/* 외곽 우측: 약한 청록 (반대쪽 나선팔) */}
      <pointLight position={[ 220, 20, -120]}  intensity={0.35} color="#00aacc" />

      {/* ── 배경 은하 파티클 ──────────────────────────────────── */}
      <DreiStars
        radius={1200}
        depth={200}
        count={16000}
        factor={3}
        saturation={0.05}
        fade
        speed={0.04}
      />

      {/* ── 은하 핵 (코어 + 링 + 나선팔 가이드) ─────────────── */}
      <GalaxyCore />

      {/* ── 갈락틱 평면 격자 ──────────────────────────────────── */}
      <GalaxyGrid />

      {/* ── 별 사이 연결선 ────────────────────────────────────── */}
      <StarConnections />

      {/* ── 저장소 별 (InstancedMesh — draw call 1회) ── */}
      <InstancedStarField />

      {/* ── 비동기 에셋 프리로드 ───────────────────────────────── */}
      <Suspense fallback={null}>
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
      flat
      camera={{ position: [0, 150, 280], fov: 55, near: 0.1, far: 3000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#01020a' }}
      frameloop="always"
      onPointerMissed={() => {
        if (!wasPointerDrag()) useUIStore.getState().closePanel()
      }}
    >
      <GalaxyScene />
    </Canvas>
  )
}
