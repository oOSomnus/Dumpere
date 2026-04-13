import * as Checkbox from '@radix-ui/react-checkbox'
import { Check, Trash2 } from 'lucide-react'
import type { Tag } from '@/shared/types'
import { cn } from '@/shared/cn'
import { getTagSoftStyle, getTagSwatchStyle } from '../../lib/tag-styles'
import { useI18n } from '@/renderer/i18n'

interface SidebarTagsSectionProps {
  tags: Tag[]
  selectedTagIds: string[]
  onTagToggle: (tagId: string) => void
  onDeleteTag: (tag: Tag) => Promise<void>
}

export function SidebarTagsSection({
  tags,
  selectedTagIds,
  onTagToggle,
  onDeleteTag
}: SidebarTagsSectionProps) {
  const { t } = useI18n()
  return (
    <div className="p-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--sidebar-foreground)' }}>
        {t('sidebar.tags')}
      </h2>

      <div className="space-y-1">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="group flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
              <Checkbox.Root
                checked={selectedTagIds.includes(tag.id)}
                onCheckedChange={() => onTagToggle(tag.id)}
                aria-label={t('sidebar.toggleTagFilter', { name: tag.name })}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center',
                  'transition-colors duration-150'
                )}
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) ? 'var(--accent)' : 'transparent',
                  borderColor: selectedTagIds.includes(tag.id) ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <Checkbox.Indicator>
                  <Check className="w-3 h-3" style={{ color: 'var(--accent-foreground)' }} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span
                className="inline-flex min-w-0 flex-1 items-center gap-2 truncate rounded-full border px-2 py-1"
                style={getTagSoftStyle(tag)}
                title={tag.name}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={getTagSwatchStyle(tag)} />
                {tag.name}
              </span>
            </label>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void onDeleteTag(tag)
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: 'var(--muted-foreground)' }}
              aria-label={t('sidebar.deleteTag', { name: tag.name })}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {tags.length === 0 && (
          <p className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t('sidebar.tagsEmpty')}
          </p>
        )}
      </div>
    </div>
  )
}
