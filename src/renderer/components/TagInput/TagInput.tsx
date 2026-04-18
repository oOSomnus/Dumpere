import { KeyboardEvent } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { X, ArrowUp, ArrowDown } from 'lucide-react'
import type { Tag } from '@/shared/types'
import { getTagSolidStyle } from '@/renderer/lib/tag-styles'
import { useTagInputState, type UseTagInputStateProps } from './useTagInputState'
import { TagInputField } from './TagInputField'
import { TagPopover, MAX_SELECTED_TAGS } from './TagPopover'

export interface TagInputProps extends UseTagInputStateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => Promise<void> | void
  onReturnFocus: () => void
}

export function TagInput({
  open,
  onOpenChange,
  onSubmit,
  onReturnFocus,
  selectedTagIds,
  onTagsChange,
  allTags,
  getAISuggestions,
  onCreateTag,
  dumpText,
}: TagInputProps) {
  const {
    filterText,
    setFilterText,
    highlightedIndex,
    setHighlightedIndex,
    aiSuggestions,
    existingTags,
    allNavigableTags,
    highlightedTag,
    selectedTags,
    inputRef,
    optionRefs,
    filterTextRef,
    handleToggleTag,
    handleCreateNewTag,
    handleRemoveSelected,
  } = useTagInputState({
    allTags,
    getAISuggestions,
    open,
    dumpText,
    selectedTagIds,
    onTagsChange,
    onCreateTag,
  })

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev < allNavigableTags.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        const tag = allNavigableTags[highlightedIndex]
        if (tag) {
          handleToggleTag(tag.id)
        }
        return
      }
      if (filterTextRef.current.trim()) {
        void handleCreateNewTag()
      } else {
        void onSubmit()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
      onReturnFocus()
    }
  }

  const handleTagClick = (tagId: string) => {
    handleToggleTag(tagId)
    setHighlightedIndex(0)
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        {/* Invisible anchor - the actual trigger is in DumpInput */}
        <div style={{ display: 'none' }} />
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          className="z-50 outline-none"
          style={{
            width: '280px',
            maxHeight: '320px',
            backgroundColor: 'var(--secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          {/* Input area */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <TagInputField
              filterText={filterText}
              highlightedTag={highlightedTag}
              onFilterTextChange={setFilterText}
              onHighlightedIndexChange={setHighlightedIndex}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
              open={open}
            />
          </div>

          {/* Scrollable content area */}
          <TagPopover
            filterText={filterText}
            aiSuggestions={aiSuggestions}
            existingTags={existingTags}
            highlightedIndex={highlightedIndex}
            selectedTagIds={selectedTagIds}
            onTagClick={handleTagClick}
            onHighlightedIndexChange={setHighlightedIndex}
            optionRefs={optionRefs}
          />

          {/* Selected Tags row */}
          {selectedTags.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                backgroundColor: 'var(--background)',
              }}
            >
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    ...getTagSolidStyle(tag),
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveSelected(tag.id)}
                    aria-label={`Remove selected tag ${tag.name}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {selectedTagIds.length >= MAX_SELECTED_TAGS && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted-foreground)',
                    alignSelf: 'center',
                  }}
                >
                  Max {MAX_SELECTED_TAGS} tags
                </span>
              )}
            </div>
          )}

          {/* Keyboard hints */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              color: 'var(--muted-foreground)',
            }}
          >
            <span>
              <ArrowUp size={10} className="inline mr-1" />
              <ArrowDown size={10} className="inline mr-1" />
              Navigate
            </span>
            <span>Shift+Enter Toggle</span>
            <span>Enter Dump/Create</span>
            <span>Esc Close</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}