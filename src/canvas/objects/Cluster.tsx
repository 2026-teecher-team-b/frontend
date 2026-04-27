/**
 * Cluster.tsx — 언어별 성단(Star Cluster) 시각화
 *
 * v2 기능:
 *  1. physicsStore centroid 추적: 라벨이 실제 별들의 무게중심으로 이동
 *  2. 밀도 감지 glow: 별들이 뭉칠수록 성단 배경이 밝아짐
 *     - avgDist(별↔중심 평균거리)를 계산 → AdditiveBlending 구체의 opacity 조절
 *  3. 레이어드 glow: 외부 헤일로 + 내부 코어 두 겹
 *
 * 구성:
 *  1. 외부 헤일로 glow (BackSide + AdditiveBlending)
 *  2. 내부 코어 glow (DoubleSide + AdditiveBlending, 밀도 반응)
 *  3. Sparkles 파티클 (drei)
 *  4. Billboard 언어 라벨
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Billboard, Text } from '@react-three/drei'
import { BackSide, DoubleSide, AdditiveBlending, MeshBasicMaterial } from 'three'
import type { Group } from 'three'
import { physicsStore } from '@/store/physicsStore'
import { getBaseCenter } from '@/utils/physics'

// ── 언어별 시각 설정 ──────────────────────────────────────────────
interface ClusterStyle {
  color: string
  glowColor: string
  coreColor: string
  sparkleCount: number
  sparkleScale: number
  sparkleSize: number
  glowRadius: number
  haloOpacity: number   // 외부 헤일로 기본 opacity
  coreOpacity: number   // 내부 코어 기본 opacity (밀도 따라 추가됨)
}

const CLUSTER_STYLES: Record<string, ClusterStyle> = {
  TypeScript: { color: '#6ab4ff', glowColor: '#1a3a8f', coreColor: '#4488ff', sparkleCount: 60, sparkleScale: 26, sparkleSize: 1.4, glowRadius: 28, haloOpacity: 0.10, coreOpacity: 0.06 },
  JavaScript: { color: '#ffe080', glowColor: '#4a3800', coreColor: '#ffcc40', sparkleCount: 55, sparkleScale: 30, sparkleSize: 1.3, glowRadius: 32, haloOpacity: 0.09, coreOpacity: 0.05 },
  Python:     { color: '#a0d8ff', glowColor: '#003366', coreColor: '#60b8ff', sparkleCount: 120,sparkleScale: 22, sparkleSize: 0.9, glowRadius: 25, haloOpacity: 0.16, coreOpacity: 0.10 },
  Go:         { color: '#00e8d0', glowColor: '#003830', coreColor: '#00c8b0', sparkleCount: 50, sparkleScale: 32, sparkleSize: 1.2, glowRadius: 34, haloOpacity: 0.09, coreOpacity: 0.05 },
  Rust:       { color: '#ff9060', glowColor: '#4a1500', coreColor: '#ff6830', sparkleCount: 50, sparkleScale: 28, sparkleSize: 1.3, glowRadius: 30, haloOpacity: 0.10, coreOpacity: 0.06 },
  Java:       { color: '#f0c060', glowColor: '#3a2800', coreColor: '#e0a030', sparkleCount: 45, sparkleScale: 26, sparkleSize: 1.2, glowRadius: 28, haloOpacity: 0.09, coreOpacity: 0.05 },
  'C++':      { color: '#ff80a0', glowColor: '#3a0020', coreColor: '#ff5080', sparkleCount: 40, sparkleScale: 30, sparkleSize: 1.1, glowRadius: 32, haloOpacity: 0.09, coreOpacity: 0.05 },
  Ruby:       { color: '#ff6060', glowColor: '#3a0000', coreColor: '#ff3030', sparkleCount: 35, sparkleScale: 26, sparkleSize: 1.2, glowRadius: 28, haloOpacity: 0.09, coreOpacity: 0.05 },
  Swift:      { color: '#ff8844', glowColor: '#3a1500', coreColor: '#ff6820', sparkleCount: 30, sparkleScale: 24, sparkleSize: 1.3, glowRadius: 26, haloOpacity: 0.09, coreOpacity: 0.05 },
}
const DEFAULT_STYLE: ClusterStyle = {
  color: '#8888cc', glowColor: '#111133', coreColor: '#6666aa',
  sparkleCount: 35, sparkleScale: 24, sparkleSize: 1.1,
  glowRadius: 26, haloOpacity: 0.07, coreOpacity: 0.04,
}

function getStyle(language: string): ClusterStyle {
  return CLUSTER_STYLES[language] ?? DEFAULT_STYLE
}

// ── 컴포넌트 ──────────────────────────────────────────────────────
interface ClusterProps {
  language: string
  starCount: number
}

export default function Cluster({ language, starCount }: ClusterProps) {
  const groupRef     = useRef<Group>(null)
  const haloMatRef   = useRef<MeshBasicMaterial>(null)
  const coreMatRef   = useRef<MeshBasicMaterial>(null)
  const style        = getStyle(language)
  const sizeMult     = Math.sqrt(starCount / 8)

  // ── physicsStore centroid 추적 + 밀도 glow ──────────────────────
  useFrame(() => {
    if (!groupRef.current) return

    const entries = physicsStore.getAll().filter((e) => e.language === language)

    if (entries.length > 0) {
      // 1. 무게중심 계산
      let cx = 0, cy = 0, cz = 0
      for (const e of entries) {
        cx += e.position.x
        cy += e.position.y
        cz += e.position.z
      }
      const n = entries.length
      cx /= n; cy /= n; cz /= n
      groupRef.current.position.set(cx, cy, cz)

      // 2. 밀도 계산: 중심으로부터의 평균 거리
      let totalDist = 0
      for (const e of entries) {
        const dx = e.position.x - cx
        const dy = e.position.y - cy
        const dz = e.position.z - cz
        totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz)
      }
      const avgDist = entries.length > 1 ? totalDist / entries.length : 999

      // 3. 밀도 비율 (avgDist 작을수록 뭉쳐 있음)
      const density = Math.max(0, Math.min(1, 1 - avgDist / 55))

      // 4. glow opacity 업데이트 (매 프레임 lerp로 부드럽게)
      if (haloMatRef.current) {
        const targetHalo = style.haloOpacity + density * 0.18
        haloMatRef.current.opacity +=
          (targetHalo - haloMatRef.current.opacity) * 0.04
      }
      if (coreMatRef.current) {
        const targetCore = style.coreOpacity + density * 0.14
        coreMatRef.current.opacity +=
          (targetCore - coreMatRef.current.opacity) * 0.04
      }
    } else {
      // 별이 없을 때 fallback
      const [bx, by, bz] = getBaseCenter(language)
      groupRef.current.position.set(bx, by, bz)
    }
  })

  return (
    <group ref={groupRef}>
      {/* 1. 외부 헤일로 glow (BackSide + AdditiveBlending) */}
      <mesh>
        <sphereGeometry args={[style.glowRadius * sizeMult, 16, 16]} />
        {/* @ts-ignore – ref로 imperative 제어 */}
        <meshBasicMaterial
          ref={haloMatRef}
          color={style.glowColor}
          transparent
          opacity={style.haloOpacity}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. 내부 코어 glow (DoubleSide + AdditiveBlending, 밀도 반응) */}
      <mesh>
        <sphereGeometry args={[style.glowRadius * sizeMult * 0.45, 12, 12]} />
        {/* @ts-ignore – ref로 imperative 제어 */}
        <meshBasicMaterial
          ref={coreMatRef}
          color={style.coreColor}
          transparent
          opacity={style.coreOpacity}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. 성단 분위기 입자 (drei Sparkles) */}
      <Sparkles
        count={Math.round(style.sparkleCount * sizeMult)}
        scale={style.sparkleScale * sizeMult}
        size={style.sparkleSize}
        speed={0.25}
        opacity={0.55}
        color={style.color}
        noise={0.6}
      />

      {/* 4. 언어 라벨 (항상 카메라를 향하는 Billboard) */}
      <Billboard follow position={[0, -(style.glowRadius * sizeMult + 6), 0]}>
        <Text
          fontSize={5.5}
          color={style.color}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.75}
          outlineWidth={0.5}
          outlineColor="#000000"
          outlineOpacity={0.65}
        >
          {language}
        </Text>
      </Billboard>
    </group>
  )
}
