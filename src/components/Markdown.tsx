import React from 'react'

/**
 * Minimal, safe Markdown renderer.
 *
 * It returns React elements (never raw HTML / dangerouslySetInnerHTML), so model
 * output cannot inject markup or scripts. Supports: headings, bold, italics,
 * inline code, ordered/unordered lists, blockquotes, horizontal rules and
 * http(s) links. Anything else is rendered as plain text.
 */

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = []
  // Order matters: code, links, bold, italic.
  const pattern = /(`[^`]+`)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const [full, code, linkFull, linkUrl, bold, italic] = match
    const key = `${keyPrefix}-${i++}`
    if (code) {
      nodes.push(
        <code key={key} className="rounded bg-surface-elevated px-1.5 py-0.5 text-[0.85em] text-brand-cyan">
          {code.slice(1, -1)}
        </code>
      )
    } else if (linkFull && linkUrl) {
      const label = linkFull.slice(1, linkFull.indexOf(']'))
      nodes.push(
        <a key={key} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:text-brand-soft">
          {label}
        </a>
      )
    } else if (bold) {
      nodes.push(<strong key={key} className="font-semibold text-ink">{bold.slice(2, -2)}</strong>)
    } else if (italic) {
      nodes.push(<em key={key}>{italic.slice(1, -1)}</em>)
    }
    lastIndex = match.index + full.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export function Markdown({ content }: { content: string }) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: string[] = []
  let listOrdered = false

  const flushList = (key: string) => {
    if (listItems.length === 0) return
    const items = listItems.map((item, i) => (
      <li key={`${key}-li-${i}`} className="ml-1">{renderInline(item, `${key}-${i}`)}</li>
    ))
    blocks.push(
      listOrdered
        ? <ol key={key} className="my-3 list-decimal space-y-1.5 pl-6 text-ink-soft">{items}</ol>
        : <ul key={key} className="my-3 list-disc space-y-1.5 pl-6 text-ink-soft">{items}</ul>
    )
    listItems = []
  }

  lines.forEach((rawLine, index) => {
    const key = `b-${index}`
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushList(`${key}-flush`)
      return
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushList(`${key}-flush`)
      const level = heading[1].length
      const text = heading[2]
      const cls = level <= 2
        ? 'mt-5 mb-2 text-lg font-semibold text-ink'
        : 'mt-4 mb-1.5 text-base font-semibold text-ink'
      blocks.push(<p key={key} className={cls} role="heading" aria-level={level}>{renderInline(text, key)}</p>)
      return
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList(`${key}-flush`)
      blocks.push(<hr key={key} className="my-4 border-surface-border" />)
      return
    }

    const ordered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed)
    const unordered = /^[-*+]\s+(.*)$/.exec(trimmed)
    if (ordered) {
      if (!listOrdered) flushList(`${key}-flush`)
      listOrdered = true
      listItems.push(ordered[2])
      return
    }
    if (unordered) {
      if (listOrdered) flushList(`${key}-flush`)
      listOrdered = false
      listItems.push(unordered[1])
      return
    }

    if (trimmed.startsWith('> ')) {
      flushList(`${key}-flush`)
      blocks.push(
        <blockquote key={key} className="my-3 border-l-2 border-brand/60 pl-4 text-ink-soft italic">
          {renderInline(trimmed.slice(2), key)}
        </blockquote>
      )
      return
    }

    flushList(`${key}-flush`)
    blocks.push(<p key={key} className="my-2 leading-relaxed text-ink-soft">{renderInline(trimmed, key)}</p>)
  })

  flushList('b-final')

  return <div className="text-[0.95rem]">{blocks}</div>
}

export default Markdown
