/**
 * SearchBar.tsx — 저장소 검색
 *
 * UX:
 *  - 상단 중앙 고정
 *  - 단축키 "/" 또는 Cmd+K 로 포커스
 *  - 검색어 없이 포커스 → 활동 상위 5개 바로 표시 (빠른 접근)
 *  - 실시간 결과 드롭다운 (최대 8개)
 *  - 키보드 탐색 (↑↓ Enter Esc)
 *  - 결과 클릭 → 해당 별 사이드패널 열기 + 카메라 추적
 *  - 검색어와 일치하는 텍스트 하이라이트
 *  - 언어 배지, 활성도 바, 활성 점수 표시
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useGalaxyStore } from '@/store/useGalaxyStore'
import { useUIStore } from '@/store/useUIStore'
import { useIsMobile } from '@/hooks/useIsMobile'

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#4f8ef7', JavaScript: '#f7d44f', Python:    '#4da8e0',
  Go:         '#00d4c8', Rust:       '#f07050', Java:      '#e8a24a',
  'C++':      '#e05080', Ruby:       '#d94040', Swift:     '#f05c30',
  Kotlin:     '#b06cff', PHP:        '#9090e0', 'C#':      '#68c060',
  Scala:      '#d04040', Haskell:    '#9060c8',
}

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-blue-400/30 text-blue-200 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function SearchBar() {
  const inputRef    = useRef<HTMLInputElement>(null)
  const dropRef     = useRef<HTMLDivElement>(null)

  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [cursor,  setCursor]  = useState(-1)

  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)
  const selectRepo   = useUIStore((s) => s.selectRepo)
  const isMobile     = useIsMobile()

  // ── 빈 쿼리 → 활동 상위 5개, 쿼리 있으면 → 필터 결과 (최대 8개) ──
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      // 포커스만 됐을 때: 활동 상위 5개 표시
      if (!open) return []
      return [...repositories]
        .sort((a, b) => (scores[b.id]?.activityScore ?? 0) - (scores[a.id]?.activityScore ?? 0))
        .slice(0, 5)
    }

    return repositories
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // 이름 앞에서 매치되는 게 우선
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return (scores[b.id]?.activityScore ?? 0) - (scores[a.id]?.activityScore ?? 0)
      })
      .slice(0, 8)
  }, [query, repositories, scores, open])

  // ── 결과 선택 ─────────────────────────────────────────────────
  const selectResult = useCallback(
    (repoId: number) => {
      selectRepo(repoId)
      setQuery('')
      setOpen(false)
      setCursor(-1)
      inputRef.current?.blur()
    },
    [selectRepo],
  )

  // ── 단축키: / 또는 Cmd+K ──────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) ||
        (e.key === 'k' && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── 드롭다운 키보드 탐색 ──────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      selectResult(results[cursor].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  // ── 외부 클릭 닫기 ────────────────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── 쿼리 변경 ──────────────────────────────────────────────
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    setCursor(-1)
  }

  const isEmptyQuery = query.trim().length === 0
  const showDrop     = open && results.length > 0
  const showNoResult = open && !isEmptyQuery && results.length === 0

  // 모바일: 상단바(status + login) 아래, 좌우 여백 12px로 전체 너비
  // 데스크톱: 상단 중앙 고정, 최대 380px
  const wrapperClass = isMobile
    ? 'absolute top-14 left-3 right-3 z-30'
    : 'absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[380px] max-w-[calc(100vw-2rem)]'

  return (
    <div className={wrapperClass}>
      {/* ── 입력창 ──────────────────────────────────────────────── */}
      <div className={`
        flex items-center gap-2.5 px-3.5 py-2.5
        bg-black/60 backdrop-blur-xl
        border rounded-xl shadow-2xl
        transition-all duration-200
        ${showDrop
          ? 'border-blue-400/40 rounded-b-none'
          : 'border-white/12 hover:border-white/20'
        }
      `}>
        {/* 검색 아이콘 */}
        <svg
          className="w-3.5 h-3.5 text-white/30 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={onChange}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`저장소 검색… (${repositories.length}개)`}
          className="
            flex-1 bg-transparent text-white/90 text-sm font-mono
            placeholder:text-white/25 outline-none
          "
          spellCheck={false}
          autoComplete="off"
        />

        {/* 클리어 버튼 */}
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="text-white/30 hover:text-white/70 transition-colors text-xs"
          >
            ✕
          </button>
        )}

        {/* 단축키 힌트 (입력 없을 때) */}
        {!query && (
          <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-white/20 font-mono border border-white/10 rounded px-1 py-0.5">
            /
          </kbd>
        )}
      </div>

      {/* ── 드롭다운 결과 ─────────────────────────────────────── */}
      {showDrop && (
        <div
          ref={dropRef}
          className="
            bg-black/75 backdrop-blur-xl
            border border-t-0 border-blue-400/30
            rounded-b-xl shadow-2xl overflow-hidden
          "
        >
          {/* 빈 쿼리일 때 헤더 */}
          {isEmptyQuery && (
            <div className="px-3.5 py-2 border-b border-white/6 text-[9px] text-white/25 font-mono">
              활동 상위 저장소
            </div>
          )}

          <ul>
            {results.map((repo, idx) => {
              const score    = scores[repo.id]
              const activity = score?.activityScore ?? 0
              const color    = LANGUAGE_COLORS[repo.language ?? ''] ?? '#aabbcc'
              const isBH     = (score?.healthScore ?? 100) < 10
              const isActive = idx === cursor

              return (
                <li key={repo.id}>
                  <button
                    className={`
                      w-full text-left px-3.5 py-2.5
                      transition-colors duration-100
                      flex items-start gap-2.5
                      ${isActive ? 'bg-blue-500/15' : 'hover:bg-white/5'}
                    `}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => selectResult(repo.id)}
                  >
                    {/* 언어 색상 인디케이터 */}
                    <span
                      className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isBH ? '#111' : color,
                        boxShadow: isBH ? 'none' : `0 0 6px ${color}80`,
                      }}
                    />

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-xs font-mono font-semibold truncate">
                        {highlight(repo.name, query.trim())}
                        {isBH && (
                          <span className="ml-1.5 text-[9px] text-red-400">🕳 블랙홀</span>
                        )}
                      </p>
                      <p className="text-white/35 text-[10px] font-mono truncate">
                        {highlight(repo.fullName, query.trim())}
                      </p>

                      {/* 활성도 바 + 점수 */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${activity}%`,
                              backgroundColor: isBH ? '#ff3300' : color,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-white/30 font-mono flex-shrink-0">
                          활동 {activity}
                        </span>
                      </div>
                    </div>

                    {/* 언어 배지 */}
                    {repo.language && (
                      <span
                        className="mt-0.5 text-[9px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          color,
                          backgroundColor: `${color}18`,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {repo.language}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 하단 힌트 */}
          <div className="px-3.5 py-1.5 border-t border-white/8 flex items-center gap-3 text-[9px] text-white/20 font-mono">
            <span>↑↓ 탐색</span>
            <span>Enter 선택</span>
            <span>Esc 닫기</span>
            {!isEmptyQuery && (
              <span className="ml-auto">{results.length}개 결과</span>
            )}
          </div>
        </div>
      )}

      {/* 검색어 있는데 결과 없을 때 */}
      {showNoResult && (
        <div className="bg-black/75 backdrop-blur-xl border border-t-0 border-white/10 rounded-b-xl px-4 py-3 text-[11px] text-white/30 font-mono">
          '{query}'에 해당하는 저장소가 없습니다
        </div>
      )}
    </div>
  )
}
