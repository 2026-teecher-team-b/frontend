/**
 * SearchBar.tsx — 저장소 검색 (HUD 리디자인)
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
      <mark className="rounded-none px-0.5" style={{ background: 'rgba(0,212,255,0.22)', color: '#00d4ff' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export default function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const [cursor, setCursor] = useState(-1)

  const repositories = useGalaxyStore((s) => s.repositories)
  const scores       = useGalaxyStore((s) => s.scores)
  const selectRepo   = useUIStore((s) => s.selectRepo)
  const isMobile     = useIsMobile()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
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
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return (scores[b.id]?.activityScore ?? 0) - (scores[a.id]?.activityScore ?? 0)
      })
      .slice(0, 8)
  }, [query, repositories, scores, open])

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); selectResult(results[cursor].id) }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur() }
  }

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    setCursor(-1)
  }

  const isEmptyQuery = query.trim().length === 0
  const showDrop     = open && results.length > 0
  const showNoResult = open && !isEmptyQuery && results.length === 0

  const wrapperClass = isMobile
    ? 'absolute top-14 left-3 right-3 z-30'
    : 'absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[380px] max-w-[calc(100vw-2rem)]'

  const inputBorderColor = showDrop
    ? 'rgba(0,212,255,0.45)'
    : 'rgba(0,212,255,0.18)'

  return (
    <div className={wrapperClass}>
      {/* ── Input ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background:  'rgba(0,10,24,0.90)',
          border:      `1px solid ${inputBorderColor}`,
          borderBottom: showDrop ? '1px solid rgba(0,212,255,0.10)' : undefined,
          backdropFilter: 'blur(16px)',
          transition: 'border-color 0.15s',
        }}
      >
        {/* ⎈ prefix icon */}
        <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(0,212,255,0.42)' }}>⎈</span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={onChange}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`저장소 검색...  (${repositories.length}개)`}
          className="flex-1 bg-transparent text-[11px] outline-none"
          style={{
            color: 'rgba(255,255,255,0.90)',
            fontFamily: 'inherit',
          }}
          spellCheck={false}
          autoComplete="off"
        />

        {/* Clear */}
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="text-[10px] transition-colors flex-shrink-0"
            style={{ color: 'rgba(0,212,255,0.35)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.75)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,212,255,0.35)')}
          >
            ✕
          </button>
        )}

        {/* Shortcut hint */}
        {!query && (
          <kbd
            className="hidden sm:flex items-center text-[8px] px-1 py-0.5 flex-shrink-0"
            style={{
              color:  'rgba(0,212,255,0.28)',
              border: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            /
          </kbd>
        )}
      </div>

      {/* ── Dropdown ──────────────────────────────────────────── */}
      {showDrop && (
        <div
          ref={dropRef}
          style={{
            background:  'rgba(0,10,24,0.95)',
            border:      '1px solid rgba(0,212,255,0.18)',
            borderTop:   'none',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Empty query header */}
          {isEmptyQuery && (
            <div
              className="px-3 py-1.5 text-[8px] tracking-[0.22em] uppercase"
              style={{
                color:        'rgba(0,212,255,0.35)',
                borderBottom: '1px solid rgba(0,212,255,0.08)',
              }}
            >
              ▸ 활동 활발한 저장소
            </div>
          )}

          <ul>
            {results.map((repo, idx) => {
              const score    = scores[repo.id]
              const activity = score?.activityScore ?? 0
              const color    = LANGUAGE_COLORS[repo.language ?? ''] ?? '#8899aa'
              const isBH     = (score?.healthScore ?? 100) < 10
              const isActive = idx === cursor

              return (
                <li key={repo.id}>
                  <button
                    className="w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors duration-75"
                    style={{ background: isActive ? 'rgba(0,212,255,0.07)' : 'transparent' }}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => selectResult(repo.id)}
                  >
                    {/* Lang dot */}
                    <span
                      className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isBH ? '#111' : color,
                        boxShadow: isBH ? 'none' : `0 0 5px ${color}80`,
                        marginTop: 4,
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>
                        {highlight(repo.name, query.trim())}
                        {isBH && (
                          <span className="ml-1.5 text-[8px]" style={{ color: '#ff3e3e' }}>⬤ BLACKHOLE</span>
                        )}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: 'rgba(0,212,255,0.35)' }}>
                        {highlight(repo.fullName, query.trim())}
                      </p>

                      {/* Activity bar */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-0.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${activity}%`,
                              backgroundColor: isBH ? '#ff3e3e' : color,
                              opacity: 0.65,
                            }}
                          />
                        </div>
                        <span className="text-[8px] flex-shrink-0" style={{ color: 'rgba(0,212,255,0.35)' }}>
                          활성 {activity}
                        </span>
                      </div>
                    </div>

                    {/* Language badge */}
                    {repo.language && (
                      <span
                        className="mt-0.5 text-[8px] flex-shrink-0 px-1.5 py-0.5 tracking-widest uppercase"
                        style={{
                          color,
                          background: `${color}12`,
                          border: `1px solid ${color}28`,
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

          {/* Footer hints */}
          <div
            className="px-3 py-1.5 flex items-center gap-3 text-[8px] tracking-widest uppercase"
            style={{
              color:     'rgba(0,212,255,0.25)',
              borderTop: '1px solid rgba(0,212,255,0.08)',
            }}
          >
            <span>↑↓ 이동</span>
            <span>⏎ 선택</span>
            <span>⎋ 닫기</span>
            {!isEmptyQuery && (
              <span className="ml-auto">{results.length}개 결과</span>
            )}
          </div>
        </div>
      )}

      {/* No results */}
      {showNoResult && (
        <div
          className="px-4 py-3 text-[10px] tracking-widest"
          style={{
            background:  'rgba(0,10,24,0.95)',
            border:      '1px solid rgba(0,212,255,0.12)',
            borderTop:   'none',
            color:       'rgba(0,212,255,0.35)',
          }}
        >
          &quot;{query}&quot; 검색 결과 없음
        </div>
      )}
    </div>
  )
}
