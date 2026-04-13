import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Sparkles, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { Tag } from '@/shared/types'
import { resolveTagColor } from '@/shared/tag-colors'
import { getTagSoftStyle, getTagSolidStyle, getTagSwatchStyle } from '../lib/tag-styles'
import { useI18n } from '@/renderer/i18n'

export interface TagInputProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => Promise<void> | void
  onReturnFocus: () => void
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  allTags: Tag[]
  getAISuggestions: (text: string) => Tag[]
  onCreateTag: (name: string) => Promise<Tag>
  dumpText: string
}

const MAX_SELECTED_TAGS = 20

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
  const { t } = useI18n()
  const [filterText, setFilterText] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState<Tag[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])

  // Debounced AI suggestions
  useEffect(() => {
    if (!dumpText || !open) return

    const timer = setTimeout(() => {
      const suggestions = getAISuggestions(dumpText)
      setAiSuggestions(suggestions)
    }, 300)

    return () => clearTimeout(timer)
  }, [dumpText, open, getAISuggestions])

  // Reset state when popup opens
  useEffect(() => {
    if (open) {
      setFilterText('')
      setHighlightedIndex(0)
      setAiSuggestions([])
    }
  }, [open])

  // Focus input when popup opens
  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  // Get filtered existing tags (exclude AI suggestions that are already in allTags)
  const existingTags = allTags.filter(
    tag =>
      tag.name.toLowerCase().includes(filterText.toLowerCase()) &&
      !aiSuggestions.some(ai => ai.id === tag.id)
  )

  // Combined list for navigation: AI suggestions + filtered existing tags
  const allNavigableTags = [...aiSuggestions, ...existingTags]
  const highlightedTag = allNavigableTags[highlightedIndex] || null

  useEffect(() => {
    if (allNavigableTags.length === 0) {
      setHighlightedIndex(0)
      return
    }

    setHighlightedIndex(prev => Math.min(prev, allNavigableTags.length - 1))
  }, [allNavigableTags.length])

  useEffect(() => {
    if (!open || !highlightedTag) return
    optionRefs.current[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [highlightedIndex, highlightedTag, open])

  const handleToggleTag = useCallback(
    (tagId: string) => {
      const isSelected = selectedTagIds.includes(tagId)
      let newTagIds: string[]

      if (isSelected) {
        newTagIds = selectedTagIds.filter(id => id !== tagId)
      } else {
        if (selectedTagIds.length >= MAX_SELECTED_TAGS) {
          return // Max limit reached
        }
        newTagIds = [...selectedTagIds, tagId]
      }

      onTagsChange(newTagIds)
    },
    [selectedTagIds, onTagsChange]
  )

  const handleCreateNewTag = useCallback(async () => {
    const trimmedName = filterText.trim()
    if (!trimmedName) return

    // Check if tag already exists
    const exists = allTags.some(
      tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      // Just select the existing tag
      const existingTag = allTags.find(
        tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
      )
      if (existingTag && !selectedTagIds.includes(existingTag.id)) {
        if (selectedTagIds.length < MAX_SELECTED_TAGS) {
          onTagsChange([...selectedTagIds, existingTag.id])
        }
      }
      setFilterText('')
      return
    }

    try {
      const newTag = await onCreateTag(trimmedName)
      if (!selectedTagIds.includes(newTag.id) && selectedTagIds.length < MAX_SELECTED_TAGS) {
        onTagsChange([...selectedTagIds, newTag.id])
      }
      setFilterText('')
    } catch {
      // Creation failed - silently ignore
    }
  }, [filterText, allTags, selectedTagIds, onCreateTag, onTagsChange])

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

      if (filterText.trim()) {
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

  const handleRemoveSelected = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId))
  }

  const selectedTags = selectedTagIds
    .map(id => allTags.find(tag => tag.id === id))
    .filter(Boolean) as Tag[]

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
            <input
              ref={inputRef}
              type="text"
              value={filterText}
              onChange={e => {
                setFilterText(e.target.value)
                setHighlightedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('tags.searchOrCreate')}
              aria-controls="tag-input-options"
              aria-activedescendant={highlightedTag ? `tag-option-${highlightedTag.id}` : undefined}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                color: filterText ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            />
          </div>

          {/* Scrollable content area */}
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
                {aiSuggestions.map((tag, index) => {
                  const isHighlighted = highlightedIndex === index
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      id={`tag-option-${tag.id}`}
                      ref={element => {
                        optionRefs.current[index] = element
                      }}
                      role="option"
                      aria-selected={isSelected}
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                      onClick={() => handleTagClick(tag.id)}
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
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={getTagSwatchStyle(tag)} />
                        {tag.name}
                      </span>
                      {isSelected && <Check size={16} />}
                    </div>
                  )
                })}
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
                      onClick={() => handleTagClick(tag.id)}
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
                      onMouseEnter={() => setHighlightedIndex(absoluteIndex)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={getTagSwatchStyle(tag)} />
                        {tag.name}
                      </span>
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
                          color: 'var(--foreground)'
                        }}
                      >
                        <Checkbox.Indicator>
                          <Check size={12} />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                    </div>
                  )
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
                  <>Press Enter to create "{filterText}"</>
                ) : (
                  <>No tags yet</>
                )}
              </div>
            )}
          </div>

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
                    ...getTagSolidStyle(tag)
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
