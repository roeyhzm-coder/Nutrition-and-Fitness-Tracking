import type { ReactNode } from 'react'

const BULLET = /^\s*[-•*]\s+/

/** Renders `**bold**` spans inside a single line. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

type Block = { kind: 'p'; text: string } | { kind: 'ul'; lines: string[] }

function toBlocks(body: string): Block[] {
  const blocks: Block[] = []
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    if (BULLET.test(line)) {
      const text = line.replace(BULLET, '')
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'ul') last.lines.push(text)
      else blocks.push({ kind: 'ul', lines: [text] })
    } else {
      blocks.push({ kind: 'p', text: line.trim() })
    }
  }
  return blocks
}

/** Lightweight structured text: paragraphs, "-" bullet lists and **bold** cues. */
export function TipBody({ body }: { body: string }) {
  const blocks = toBlocks(body)
  if (blocks.length === 0) return null
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-700">
      {blocks.map((block, i) =>
        block.kind === 'ul' ? (
          <ul key={i} className="space-y-1">
            {block.lines.map((line, j) => (
              <li key={j} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-blue-500/70"
                />
                <span className="min-w-0">{inline(line)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(block.text)}</p>
        ),
      )}
    </div>
  )
}
