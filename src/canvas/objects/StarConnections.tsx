/**
 * StarConnections.tsx — 같은 언어 별 사이의 투명 연결선
 *
 * 최적화 v2 — Spatial Hash 전환
 *  - 기존: 언어 그룹 내 이중 루프 O(n²), e.g. C++ 122개 → 7,381회/tick
 *  - 변경: Grid-based Spatial Hash → 인접 셀(3×3×3=27) 만 탐색 O(n)
 *    · CELL_SIZE = MAX_CONNECT_DIST(55) 로 설정 → 한 셀 간격이 최대 연결 거리
 *    · 각 별마다 27개 셀 × 평균 ~4 개/셀 = ~108 후보만 검사
 *    · 언어 필터 후 실제 비교는 ~5-10회 수준
 *  - 재계산 주기: 90 → 60 프레임으로 단축 (해시 덕분에 빠르므로)
 *
 * 불변 사항:
 *  - LineSegments 단일 draw call 유지
 *  - AdditiveBlending — 별이 뭉칠수록 선이 밝아 보임
 *  - MAX_CONNECTIONS_PER_STAR(3), MAX_CONNECT_DIST(55) 동일
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { physicsStore, type PhysicsEntry } from '@/store/physicsStore'
import { LANGUAGE_COLORS, DEFAULT_COLOR } from '@/utils/physics'

const MAX_CONNECTIONS_PER_STAR = 3
const MAX_CONNECT_DIST         = 55
const MAX_CONNECT_DIST_SQ      = MAX_CONNECT_DIST * MAX_CONNECT_DIST   // 거리²로 비교 (sqrt 생략)
const CELL_SIZE                = MAX_CONNECT_DIST                       // 셀 크기 = 최대 연결 거리
const RECOMPUTE_INTERVAL       = 60   // 프레임마다 쌍 재계산 (Spatial Hash라 빠름)

// 연결 쌍: [repoIdA, repoIdB]
type Pair = [number, number]

// ── Spatial Hash ────────────────────────────────────────────────────
/**
 * 엔트리 배열을 CELL_SIZE 크기 3D 그리드에 해싱.
 * key: "cx,cy,cz" 문자열 → 해당 셀 안의 엔트리 배열
 */
function buildSpatialHash(entries: PhysicsEntry[]): Map<string, PhysicsEntry[]> {
  const hash = new Map<string, PhysicsEntry[]>()
  for (const e of entries) {
    const key = cellKey(
      Math.floor(e.position.x / CELL_SIZE),
      Math.floor(e.position.y / CELL_SIZE),
      Math.floor(e.position.z / CELL_SIZE),
    )
    let cell = hash.get(key)
    if (!cell) { cell = []; hash.set(key, cell) }
    cell.push(e)
  }
  return hash
}

function cellKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

// ─────────────────────────────────────────────────────────────────────
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

  // ── 버퍼 (최대 3000쌍 × 2점 × 3채널) ─────────────────────────
  const MAX_PAIRS = 3000
  const posArr = useMemo(() => new Float32Array(MAX_PAIRS * 2 * 3), [])
  const colArr = useMemo(() => new Float32Array(MAX_PAIRS * 2 * 3), [])

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

  // ── 쌍 재계산 (Spatial Hash) ───────────────────────────────────
  function recomputePairs() {
    const entries = physicsStore.getAll()
    const hash    = buildSpatialHash(entries)

    const pairs: Pair[]             = []
    const connCount = new Map<number, number>()

    for (const e of entries) {
      if (pairs.length >= MAX_PAIRS) break
      if ((connCount.get(e.repoId) ?? 0) >= MAX_CONNECTIONS_PER_STAR) continue

      const cx = Math.floor(e.position.x / CELL_SIZE)
      const cy = Math.floor(e.position.y / CELL_SIZE)
      const cz = Math.floor(e.position.z / CELL_SIZE)

      // 3×3×3 = 27개 인접 셀 탐색
      for (let dx = -1; dx <= 1 && pairs.length < MAX_PAIRS; dx++) {
        for (let dy = -1; dy <= 1 && pairs.length < MAX_PAIRS; dy++) {
          for (let dz = -1; dz <= 1 && pairs.length < MAX_PAIRS; dz++) {
            const neighbors = hash.get(cellKey(cx + dx, cy + dy, cz + dz))
            if (!neighbors) continue

            for (const nb of neighbors) {
              // repoId 정렬로 중복 쌍 방지 (nb.repoId > e.repoId 일 때만 처리)
              if (nb.repoId <= e.repoId) continue
              if (nb.language !== e.language) continue
              if ((connCount.get(nb.repoId) ?? 0) >= MAX_CONNECTIONS_PER_STAR) continue
              if (pairs.length >= MAX_PAIRS) break

              // sqrt 없이 거리² 비교 (성능 절약)
              const dx2 = e.position.x - nb.position.x
              const dy2 = e.position.y - nb.position.y
              const dz2 = e.position.z - nb.position.z
              const distSq = dx2 * dx2 + dy2 * dy2 + dz2 * dz2
              if (distSq > MAX_CONNECT_DIST_SQ) continue

              pairs.push([e.repoId, nb.repoId])
              connCount.set(e.repoId, (connCount.get(e.repoId) ?? 0) + 1)
              connCount.set(nb.repoId, (connCount.get(nb.repoId) ?? 0) + 1)
            }
          }
        }
      }
    }

    pairsRef.current = pairs
  }

  // ── 매 프레임 위치 업데이트 ───────────────────────────────────
  useFrame(() => {
    frameRef.current++

    if (frameRef.current % RECOMPUTE_INTERVAL === 0) {
      recomputePairs()
    }

    const pairs   = pairsRef.current
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geo.getAttribute('color')    as THREE.BufferAttribute
    const entryMap = physicsStore.entries

    let pi = 0
    let ci = 0

    for (const [idA, idB] of pairs) {
      const a = entryMap.get(idA)
      const b = entryMap.get(idB)
      if (!a || !b) {
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

    // 나머지 버퍼 초기화 (이전 프레임보다 쌍 수가 줄었을 때 잔상 방지)
    while (pi < posArr.length) posArr[pi++] = 0
    while (ci < colArr.length) colArr[ci++] = 0

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geo.setDrawRange(0, pairs.length * 2)
  })

  // 마운트 시 초기 계산
  useEffect(() => {
    const id = setTimeout(recomputePairs, 500)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <lineSegments ref={linesRef} geometry={geo} material={mat} />
  )
}
