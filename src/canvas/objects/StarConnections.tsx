/**
 * StarConnections.tsx — 같은 언어 별 사이의 투명 연결선
 *
 * 동작:
 *  - 60프레임마다 한 번 같은 언어·근접 쌍 재계산 (O(n²) 이지만 같은 언어 내)
 *  - 매 프레임 physicsStore에서 현재 위치를 읽어 LineSegments 버퍼 업데이트
 *  - 한 별당 최대 3개 연결, 거리 55 이내만 연결
 *  - AdditiveBlending → 별이 뭉칠수록 선이 밝아 보임
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { physicsStore } from '@/store/physicsStore'
import { LANGUAGE_COLORS, DEFAULT_COLOR } from '@/utils/physics'

const MAX_CONNECTIONS_PER_STAR = 3
const MAX_CONNECT_DIST         = 55
const RECOMPUTE_INTERVAL       = 60  // 프레임마다 재계산

// 연결 쌍: [repoIdA, repoIdB]
type Pair = [number, number]

// ─────────────────────────────────────────────────────────────────
export default function StarConnections() {
  const linesRef = useRef<THREE.LineSegments>(null)
  const frameRef = useRef(0)
  const pairsRef = useRef<Pair[]>([])

  // ── 언어별 색상 THREE.Color 캐시 ──────────────────────────────
  const colorCache = useMemo(() => {
    const cache = new Map<string, THREE.Color>()
    Object.entries(LANGUAGE_COLORS).forEach(([lang, hex]) => {
      cache.set(lang, new THREE.Color(hex))
    })
    cache.set('default', new THREE.Color(DEFAULT_COLOR))
    return cache
  }, [])

  // ── 최대 연결선 수를 고려한 버퍼 (1000별 × 3 = 최대 3000쌍 × 2점)
  const MAX_PAIRS = 3000
  const posArr  = useMemo(() => new Float32Array(MAX_PAIRS * 2 * 3), [])
  const colArr  = useMemo(() => new Float32Array(MAX_PAIRS * 2 * 3), [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('color',    new THREE.BufferAttribute(colArr, 3).setUsage(THREE.DynamicDrawUsage))
    return g
  }, [posArr, colArr])

  const mat = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.18,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
  }), [])

  // ── 쌍 재계산 ─────────────────────────────────────────────────
  function recomputePairs() {
    const entries = physicsStore.getAll()
    // 언어별 그룹
    const byLang = new Map<string, typeof entries>()
    for (const e of entries) {
      const key = e.language ?? '__unknown'
      if (!byLang.has(key)) byLang.set(key, [])
      byLang.get(key)!.push(e)
    }

    const pairs: Pair[] = []
    const connCount = new Map<number, number>()

    for (const group of byLang.values()) {
      if (group.length < 2) continue
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (pairs.length >= MAX_PAIRS) break
          const a = group[i], b = group[j]
          if ((connCount.get(a.repoId) ?? 0) >= MAX_CONNECTIONS_PER_STAR) continue
          if ((connCount.get(b.repoId) ?? 0) >= MAX_CONNECTIONS_PER_STAR) continue
          const dist = a.position.distanceTo(b.position)
          if (dist > MAX_CONNECT_DIST) continue
          pairs.push([a.repoId, b.repoId])
          connCount.set(a.repoId, (connCount.get(a.repoId) ?? 0) + 1)
          connCount.set(b.repoId, (connCount.get(b.repoId) ?? 0) + 1)
        }
        if (pairs.length >= MAX_PAIRS) break
      }
    }

    pairsRef.current = pairs
  }

  // ── 매 프레임 위치 업데이트 ───────────────────────────────────
  useFrame(() => {
    frameRef.current++

    // 60프레임마다 쌍 재계산
    if (frameRef.current % RECOMPUTE_INTERVAL === 0) {
      recomputePairs()
    }

    const pairs = pairsRef.current
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geo.getAttribute('color')    as THREE.BufferAttribute
    const entryMap = physicsStore.entries

    let pi = 0
    let ci = 0

    for (const [idA, idB] of pairs) {
      const a = entryMap.get(idA)
      const b = entryMap.get(idB)
      if (!a || !b) {
        // 빈 자리 (0,0,0 → 보이지 않음)
        posArr[pi++] = 0; posArr[pi++] = 0; posArr[pi++] = 0
        posArr[pi++] = 0; posArr[pi++] = 0; posArr[pi++] = 0
        colArr[ci++] = 0; colArr[ci++] = 0; colArr[ci++] = 0
        colArr[ci++] = 0; colArr[ci++] = 0; colArr[ci++] = 0
        continue
      }

      posArr[pi++] = a.position.x; posArr[pi++] = a.position.y; posArr[pi++] = a.position.z
      posArr[pi++] = b.position.x; posArr[pi++] = b.position.y; posArr[pi++] = b.position.z

      const col = colorCache.get(a.language ?? 'default') ?? colorCache.get('default')!
      colArr[ci++] = col.r; colArr[ci++] = col.g; colArr[ci++] = col.b
      colArr[ci++] = col.r; colArr[ci++] = col.g; colArr[ci++] = col.b
    }

    // 나머지 버퍼 초기화 (이전 프레임에 더 많은 쌍이 있었을 경우)
    while (pi < posArr.length) { posArr[pi++] = 0 }
    while (ci < colArr.length) { colArr[ci++] = 0 }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    // drawRange: 실제 사용한 버텍스만 그리기 (나머지 0,0,0 제외)
    geo.setDrawRange(0, pairs.length * 2)
  })

  // 마운트 시 초기 계산 (약간 지연)
  useEffect(() => {
    const id = setTimeout(recomputePairs, 500)
    return () => clearTimeout(id)
  }, [])

  return (
    <lineSegments ref={linesRef} geometry={geo} material={mat} />
  )
}
