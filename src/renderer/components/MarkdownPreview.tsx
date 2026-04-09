interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={className}>
      {content.split('\n').map((line, index) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-semibold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>
              {line.slice(3)}
            </h2>
          )
        }

        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-2xl font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>
              {line.slice(2)}
            </h1>
          )
        }

        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 mb-1" style={{ color: 'var(--foreground)' }}>
              {line.slice(2)}
            </li>
          )
        }

        if (!line.trim()) {
          return <br key={index} />
        }

        return (
          <p key={index} className="mb-2 whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
            {line}
          </p>
        )
      })}
    </div>
  )
}
