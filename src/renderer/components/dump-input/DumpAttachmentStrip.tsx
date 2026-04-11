import { FileChip } from '@/renderer/components/FileChip'

interface AttachmentItem {
  id: string
  name: string
}

interface DumpAttachmentStripProps {
  files: AttachmentItem[]
  onRemove: (id: string) => void
}

export function DumpAttachmentStrip({ files, onRemove }: DumpAttachmentStripProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <div
      className="flex gap-2 px-4 pt-2 overflow-x-auto"
      style={{ maxHeight: '80px' }}
    >
      {files.map(file => (
        <FileChip
          key={file.id}
          name={file.name}
          onRemove={() => onRemove(file.id)}
        />
      ))}
    </div>
  )
}
