/**
 * Markdown.tsx — 경량 마크다운 렌더러 (외부 의존성 없음)
 *
 * RAG 답변이 마크다운(`**굵게**`, `*` 불릿, `1.` 번호목록, `# 제목`, `` `코드` ``)으로
 * 오기 때문에, 화면에 `*` 같은 기호가 그대로 노출되지 않도록 실제 스타일로 변환한다.
 *
 * 지원: 제목(h1~h6), 굵게, 인라인 코드, 순서/비순서 목록, 문단.
 * (표·이미지·링크 등 고급 문법은 미지원 — RAG 답변 범위에 맞춤)
 */
import type { ReactNode } from 'react'

/** 인라인 파싱: **굵게**, `코드` */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${k}`} className="font-bold text-white">
          {m[2]}
        </strong>,
      )
    } else if (m[3] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${k}`}
          className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[0.92em]"
          style={{ color: '#7fe3ff' }}
        >
          {m[3]}
        </code>,
      )
    }
    lastIndex = regex.lastIndex
    k++
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

type OrderedItem = { num: string; text: string }

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: OrderedItem[] }
  | { type: 'p'; text: string }

/** 줄 단위로 블록(제목/목록/문단) 그룹화 */
function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let ul: string[] = []
  let ol: OrderedItem[] = []

  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] } }
  const flushUl   = () => { if (ul.length)   { blocks.push({ type: 'ul', items: ul }); ul = [] } }
  const flushOl   = () => { if (ol.length)   { blocks.push({ type: 'ol', items: ol }); ol = [] } }
  const flushAll  = () => { flushPara(); flushUl(); flushOl() }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flushAll(); continue }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      flushAll()
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }

    // 비순서 목록: "* 내용" 또는 "- 내용" (단, "**굵게"는 제외)
    const unordered = /^\s*[*-]\s+(.+)$/.exec(line)
    if (unordered && !/^\s*\*\*/.test(line)) {
      flushPara(); flushOl()
      ul.push(unordered[1])
      continue
    }

    // 순서 목록: "1. 내용" — 원본 번호 보존 (하위 불릿으로 끊겨도 번호 유지)
    const ordered = /^\s*(\d+)\.\s+(.+)$/.exec(line)
    if (ordered) {
      flushPara(); flushUl()
      ol.push({ num: ordered[1], text: ordered[2] })
      continue
    }

    flushUl(); flushOl()
    para.push(line.trim())
  }
  flushAll()
  return blocks
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-lg font-bold',
  2: 'text-base font-bold',
  3: 'text-[15px] font-bold',
  4: 'text-[14px] font-semibold',
  5: 'text-[14px] font-semibold',
  6: 'text-[13px] font-semibold',
}

interface Props {
  content: string
  className?: string
}

export default function Markdown({ content, className }: Props) {
  const blocks = parseBlocks(content)

  return (
    <div className={className} style={{ color: 'rgba(255,255,255,0.78)' }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <p
                key={i}
                className={`${HEADING_CLASS[block.level] ?? 'text-[14px] font-semibold'} mt-3 mb-1.5 text-white`}
              >
                {renderInline(block.text, `h${i}`)}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="my-1.5 space-y-1">
                {block.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-[14px] leading-relaxed">
                    <span className="mt-[2px] flex-shrink-0" style={{ color: 'rgba(0,212,255,0.6)' }}>•</span>
                    <span>{renderInline(it, `ul${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="my-1.5 space-y-1">
                {block.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-[14px] leading-relaxed">
                    <span className="flex-shrink-0 font-semibold tabular-nums" style={{ color: 'rgba(0,212,255,0.7)' }}>
                      {it.num}.
                    </span>
                    <span>{renderInline(it.text, `ol${i}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            )
          default:
            return (
              <p key={i} className="text-[14px] leading-relaxed my-1.5">
                {renderInline(block.text, `p${i}`)}
              </p>
            )
        }
      })}
    </div>
  )
}
