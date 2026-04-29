/**
 * MeteorEffect.tsx — 유성(Shooting Star) 이펙트
 *
 * 구현:
 *  - MAX_METEORS개 유성을 풀(pool)로 관리
 *  - 각 유성은 랜덤 시작점에서 랜덤 방향으로 고속 이동
 *  - 꼬리: drei의 Line 컴포넌트로 표현 (여러 포인트로 잔상)
 *  - 헤드: 작은 밝은 구체
 *  - Lerp로 opacity 페이드인/아웃
 *
 * 트리거:
 *  - RESPAWN_INTERVAL_MS 마다 랜덤 유성 생성
 *  - (7~8주차) 트렌딩 급등 이벤트와 연동 예정
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

// ── 상수 ──────────────────────────────────────────────────────────
const MAX_METEORS = 4
const METEOR_SPEED = 120          // units/s
const TRAIL_LENGTH = 38           // 꼬리 길이 (units)
const TRAIL_SEGMENTS = 12         // 꼬리 포인트 수
const RESPAWN_INTERVAL_MS = 5500  // 평균 재출현 간격
const FADE_IN_TIME = 0.15         // 페이드인 시간 (초)
const LIFETIME = 1.8              // 유성 총 수명 (초)
const SPAWN_RADIUS = 160          // 출현 반경

interface MeteorState {
  active: boolean
  position: THREE.Vector3    // 현재 헤드 위치
  direction: THREE.Vector3   // 정규화된 이동 방향
  age: number                // 수명 (초)
  opacity: number
  color: string
}

// 유성 색상 팔레트
const METEOR_COLORS = ['#ffffff', '#d0e8ff', '#ffe8d0', '#d0ffd0', '#ffd0ff']

function spawnMeteor(m: MeteorState) {
  // 랜덤 시작 위치 (화면 가장자리 근처)
  const theta = Math.random() * Math.PI * 2
  const phi   = Math.acos(2 * Math.random() - 1)
  m.position.set(
    Math.sin(phi) * Math.cos(theta) * SPAWN_RADIUS,
    Math.sin(phi) * Math.sin(theta) * SPAWN_RADIUS,
    (Math.random() - 0.5) * 80,
  )
  // 방향: 대략 중심을 향하되 약간 비틈
  m.direction.set(
    -m.position.x + (Math.random() - 0.5) * 60,
    -m.position.y + (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 30,
  ).normalize()
  m.age = 0
  m.opacity = 0
  m.active = true
  m.color = METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)]
}

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function MeteorEffect() {
  // 유성 상태 풀 (ref — React 상태 아님)
  const meteors = useRef<MeteorState[]>(
    Array.from({ length: MAX_METEORS }, () => ({
      active: false,
      position:  new THREE.Vector3(),
      direction: new THREE.Vector3(1, 0, 0),
      age: 0,
      opacity: 0,
      color: '#ffffff',
    })),
  )

  // 다음 유성 출현 예약 시각 (각 슬롯별)
  const nextSpawn = useRef<number[]>(
    Array.from({ length: MAX_METEORS }, (_, i) =>
      (i * RESPAWN_INTERVAL_MS) / MAX_METEORS / 1000,
    ),
  )

  // 꼬리 포인트를 저장하는 Buffer (슬롯별) — Line 렌더에 사용
  // 각 슬롯: TRAIL_SEGMENTS+1 개의 Vector3
  const trailBuffers = useRef<THREE.Vector3[][]>(
    Array.from({ length: MAX_METEORS }, () =>
      Array.from({ length: TRAIL_SEGMENTS + 1 }, () => new THREE.Vector3()),
    ),
  )

  // Line 컴포넌트에 넘길 포인트 배열 (useMemo로 초기화)
  const trailPoints = useMemo(
    () =>
      Array.from({ length: MAX_METEORS }, (_, i) =>
        trailBuffers.current[i].map((v) => v.clone()),
      ),
    [],
  )

  // Line refs (opacity 직접 조작용)
  const lineRefs = useRef<(THREE.Line | null)[]>(Array(MAX_METEORS).fill(null))
  const headRefs = useRef<(THREE.Mesh | null)[]>(Array(MAX_METEORS).fill(null))

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    for (let i = 0; i < MAX_METEORS; i++) {
      const m = meteors.current[i]

      // 비활성 → 스폰 타이머 확인
      if (!m.active) {
        if (time >= nextSpawn.current[i]) {
          spawnMeteor(m)
        }
        continue
      }

      // 수명 갱신
      m.age += delta

      // 수명 만료 → 비활성화 + 다음 스폰 예약
      if (m.age >= LIFETIME) {
        m.active = false
        m.opacity = 0
        nextSpawn.current[i] =
          time + RESPAWN_INTERVAL_MS / 1000 * (0.5 + Math.random())

        // 꼬리 숨기기
        if (lineRefs.current[i]) {
          const mat = (lineRefs.current[i] as THREE.Line).material as THREE.LineBasicMaterial
          mat.opacity = 0
        }
        if (headRefs.current[i]) {
          headRefs.current[i]!.visible = false
        }
        continue
      }

      // 위치 이동
      m.position.addScaledVector(m.direction, METEOR_SPEED * delta)

      // 페이드인/아웃 (Lerp)
      const lifeRatio = m.age / LIFETIME
      let targetOpacity: number
      if (lifeRatio < FADE_IN_TIME / LIFETIME) {
        targetOpacity = lifeRatio / (FADE_IN_TIME / LIFETIME)
      } else if (lifeRatio > 0.6) {
        targetOpacity = 1 - (lifeRatio - 0.6) / 0.4
      } else {
        targetOpacity = 1
      }
      m.opacity += (targetOpacity - m.opacity) * Math.min(delta * 12, 1)

      // ── 꼬리 포인트 계산 ─────────────────────────────────────────
      const buf = trailBuffers.current[i]
      const tPts = trailPoints[i]
      for (let s = 0; s <= TRAIL_SEGMENTS; s++) {
        const t = s / TRAIL_SEGMENTS
        buf[s].copy(m.position).addScaledVector(m.direction, -TRAIL_LENGTH * t)
        tPts[s].copy(buf[s])
      }

      // ── Line 머티리얼 업데이트 ────────────────────────────────────
      const line = lineRefs.current[i]
      if (line) {
        const mat = line.material as THREE.LineBasicMaterial
        mat.opacity = m.opacity
        mat.color.set(m.color)
        // 꼬리 geometry 업데이트
        const geo = line.geometry as THREE.BufferGeometry
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
        for (let s = 0; s <= TRAIL_SEGMENTS; s++) {
          posAttr.setXYZ(s, tPts[s].x, tPts[s].y, tPts[s].z)
        }
        posAttr.needsUpdate = true
        line.visible = true
      }

      // ── 헤드(밝은 구체) 위치 ─────────────────────────────────────
      const head = headRefs.current[i]
      if (head) {
        head.position.copy(m.position)
        head.visible = true
        const mat = head.material as THREE.MeshBasicMaterial
        mat.opacity = m.opacity
        mat.color.set(m.color)
      }
    }
  })

  return (
    <group>
      {Array.from({ length: MAX_METEORS }, (_, i) => (
        <group key={i}>
          {/* 유성 꼬리 */}
          <Line
            ref={(ref) => {
              lineRefs.current[i] = ref as THREE.Line | null
            }}
            points={trailPoints[i]}
            color="#ffffff"
            lineWidth={1.2}
            transparent
            opacity={0}
            visible={false}
          />

          {/* 유성 헤드 */}
          <mesh
            ref={(ref) => {
              headRefs.current[i] = ref as THREE.Mesh | null
            }}
            visible={false}
          >
            <sphereGeometry args={[0.7, 6, 6]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
