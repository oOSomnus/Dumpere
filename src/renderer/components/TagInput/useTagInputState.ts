import { useState, useRef, useEffect, useCallback } from 'react'
import type { Tag } from '@/shared/types'

export interface UseTagInputStateProps {
  allTags: Tag[]
  getAISuggestions: (text: string) => Tag[]
  open: boolean
  dumpText: string
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  onCreateTag: (name: string) => Promise<Tag>
}

export interface UseTagInputStateReturn {
  filterText: string
  setFilterText: (value: string) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  aiSuggestions: Tag[]
  existingTags: Tag[]
  allNavigableTags: Tag[]
  highlightedTag: Tag | null
  selectedTags: Tag[]
  inputRef: React.RefObject<HTMLInputElement | null>
  optionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  filterTextRef: React.MutableRefObject<string>
  handleToggleTag: (tagId: string) => void
  handleCreateNewTag: () => Promise<void>
  handleRemoveSelected: (tagId: string) => void
}

const MAX_SELECTED_TAGS = 20

export function useTagInputState({
  allTags,
  getAISuggestions,
  open,
  dumpText,
  selectedTagIds,
  onTagsChange,
  onCreateTag,
}: UseTagInputStateProps): UseTagInputStateReturn {
  const [filterText, setFilterText] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState<Tag[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const filterTextRef = useRef('')

  const updateFilterText = useCallback((value: string) => {
    filterTextRef.current = value
    setFilterText(value)
  }, [])

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
      filterTextRef.current = ''
      setFilterText('')
      setHighlightedIndex(0)
      setAiSuggestions([])
    }
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
        if (selectedTagIds.length >= MAX_SELECTED_TAGS) return
        newTagIds = [...selectedTagIds, tagId]
      }
      onTagsChange(newTagIds)
    },
    [selectedTagIds, onTagsChange]
  )

  const handleCreateNewTag = useCallback(async () => {
    const trimmedName = filterTextRef.current.trim()
    if (!trimmedName) return
    const exists = allTags.some(
      tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      const existingTag = allTags.find(
        tag => tag.name.toLowerCase() === trimmedName.toLowerCase()
      )
      if (existingTag && !selectedTagIds.includes(existingTag.id)) {
        if (selectedTagIds.length < MAX_SELECTED_TAGS) {
          onTagsChange([...selectedTagIds, existingTag.id])
        }
      }
      updateFilterText('')
      return
    }
    try {
      const newTag = await onCreateTag(trimmedName)
      if (!selectedTagIds.includes(newTag.id) && selectedTagIds.length < MAX_SELECTED_TAGS) {
        onTagsChange([...selectedTagIds, newTag.id])
      }
      updateFilterText('')
    } catch {
      // Creation failed - silently ignore
    }
  }, [allTags, onCreateTag, onTagsChange, selectedTagIds, updateFilterText])

  const handleRemoveSelected = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId))
  }

  const selectedTags = selectedTagIds
    .map(id => allTags.find(tag => tag.id === id))
    .filter(Boolean) as Tag[]

  return {
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
  }
}
