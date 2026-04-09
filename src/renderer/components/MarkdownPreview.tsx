import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Image, Link2, TriangleAlert } from 'lucide-react'
import type { DumpEntry } from '../lib/types'

interface DumpReferenceCardProps {
  dump: DumpEntry | null
  dumpId: string
  onDumpClick?: (dump: DumpEntry) => void
}

function preprocessDumpReferences(content: string): string {
  return content.replace(
    /\[\[dump:([^[\]\s]+)\]\]/g,
    (_match, dumpId: string) => `[dump:${dumpId}](/__dump__/${dumpId})`
  )
}

function DumpReferenceCard({ dump, dumpId, onDumpClick }: DumpReferenceCardProps) {
  if (!dump) {
    return (
      <div
        className="my-3 rounded-xl border p-3"
        style={{ borderColor: 'var(--destructive)', backgroundColor: 'var(--secondary)' }}
      >
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          <TriangleAlert className="h-4 w-4" />
          Missing dump reference
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          `[[dump:{dumpId}]]` no longer points to an existing dump.
        </p>
      </div>
    )
  }

  const summary = dump.text.trim() || 'No text in this dump.'
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dump.createdAt))
  const firstImage = dump.files.find(file => file.mimeType.startsWith('image/'))

  return (
    <button
      type="button"
      onClick={() => onDumpClick?.(dump)}
      className="my-3 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
      >
        {firstImage ? <Image className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Dump reference
          </p>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {formattedTime}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--foreground)' }}>
          {summary}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span>{dump.files.length} attachments</span>
          <span>View details</span>
        </div>
      </div>
    </button>
  )
}

interface MarkdownPreviewProps {
  content: string
  className?: string
  dumpLookup?: (dumpId: string) => DumpEntry | undefined
  onDumpClick?: (dump: DumpEntry) => void
}

export function MarkdownPreview({ content, className, dumpLookup, onDumpClick }: MarkdownPreviewProps) {
  const normalizedContent = useMemo(() => preprocessDumpReferences(content), [content])

  return (
    <div className={className} style={{ color: 'var(--foreground)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-semibold mt-2 mb-1">{children}</h6>
          ),
          p: ({ children }) => (
            <p className="mb-2 whitespace-pre-wrap">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            if (isInline) {
              return (
                <code className="bg-muted px-1 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <pre className="bg-muted rounded my-2 p-3 overflow-x-auto text-sm">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          a: ({ href, children }) => {
            if (href?.startsWith('/__dump__/')) {
              const dumpId = href.replace('/__dump__/', '')
              return (
                <DumpReferenceCard
                  dump={dumpLookup?.(dumpId) ?? null}
                  dumpId={dumpId}
                  onDumpClick={onDumpClick}
                />
              )
            }

            return (
              <a
                href={href}
                className="text-blue-500 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded my-2" />
          ),
          hr: () => <hr className="border-t my-4" />,
          table: ({ children }) => (
            <table className="border-collapse border my-2 w-full">
              {children}
            </table>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => (
            <th className="border px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border px-2 py-1">{children}</td>
          ),
          input: ({ node, ...props }) => {
            if (node?.properties?.type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  className="mr-2 cursor-pointer"
                  readOnly
                  {...props}
                />
              )
            }
            return <input {...props} />
          },
          del: ({ children }) => (
            <del className="line-through opacity-60">{children}</del>
          ),
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}
