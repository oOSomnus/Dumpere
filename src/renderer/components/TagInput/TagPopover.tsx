import * as Checkbox from '@radix-ui/react-checkbox'
import { Sparkles, Check } from 'lucide-react'
import type { Tag } from '@/shared/types'
import { getTagSoftStyle, getTagSwatchStyle } from '@/renderer/lib/tag-styles'
import { useI18n } from '@/renderer/i18n'
import { resolveTagColor } from '@/shared/tag-colors'

export interface TagPopoverProps {
  filterText: string
  aiSuggestions: Tag[]
  existingTags: Tag[]
  highlightedIndex: number
  selectedTagIds: string[]
  onTagClick: (tagId: string) => void
  onHighlightedIndexChange: (index: number) => void
  optionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

const MAX_SELECTED_TAGS = 20

export function TagPopover({
  filterText,
  aiSuggestions,
  existingTags,
  highlightedIndex,
  selectedTagIds,
  onTagClick,
  onHighlightedIndexChange,
  optionRefs,
}: TagPopoverProps) {
  const { t } = useI18n()

  const renderTagItem = (tag: Tag, absoluteIndex: number, isAiSuggestion: boolean) => {
    const isHighlighted = highlightedIndex === absoluteIndex
    const isSelected = selectedTagIds.includes(tag.id)
    const tagColor = resolveTagColor(tag, absoluteIndex)
    return (
      <div
        key={tag.id}
        id={`tag-option-${tag.id}`}
        ref={element => {
          optionRefs.current[absoluteIndex] = element
        }}
        role="option"
        aria-selected={isSelected}
        data-highlighted={isHighlighted ? 'true' : 'false'}
        onClick={() => onTagClick(tag.id)}
        className="w-full text-left transition-colors"
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...(isHighlighted ? getTagSoftStyle(tag) : {}),
          color: 'var(--foreground)',
          fontSize: '14px',
          boxShadow: isHighlighted ? 'inset 0 0 0 1px var(--border)' : 'none',
        }}
        onMouseEnter={() => onHighlightedIndexChange(absoluteIndex)}
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={getTagSwatchStyle(tag)} />
          {tag.name}
        </span>
        {isAiSuggestion ? (
          isSelected && <Check size={16} />
        ) : (
          <Checkbox.Root
            checked={isSelected}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected ? tagColor : 'transparent',
              borderColor: isSelected ? tagColor : 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            <Checkbox.Indicator>
              <Check size={12} />
            </Checkbox.Indicator>
          </Checkbox.Root>
        )}
      </div>
    )
  }

  return (
    <div
      id="tag-input-options"
      role="listbox"
      aria-multiselectable="true"
      style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '240px',
      }}
    >
      {/* AI Suggestions section */}
      {aiSuggestions.length > 0 && (
        <div>
          <div
            style={{
              padding: '6px 12px 4px',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <Sparkles size={12} className="inline mr-1" />
            {t('tags.aiSuggestions')}
          </div>
          {aiSuggestions.map((tag, index) => renderTagItem(tag, index, true))}
        </div>
      )}

      {/* Existing Tags section */}
      {existingTags.length > 0 && (
        <div>
          {aiSuggestions.length > 0 && (
            <div
              style={{
                padding: '6px 12px 4px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Tags
            </div>
          )}
          {existingTags.map((tag, index) => {
            const absoluteIndex = aiSuggestions.length + index
            return renderTagItem(tag, absoluteIndex, false)
          })}
        </div>
      )}

      {/* No results */}
      {aiSuggestions.length === 0 && existingTags.length === 0 && (
        <div
          style={{
            padding: '16px 12px',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '13px',
          }}
        >
          {filterText ? (
            <>Press Enter to create &quot;{filterText}&quot;</>
          ) : (
            <>No tags yet</>
          )}
        </div>
      )}
    </div>
  )
}

export { MAX_SELECTED_TAGS }
