import { useState, useEffect } from 'react'
import { Tag, mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

// Input validation constants
const MAX_TAG_NAME_LENGTH = 30
const TAG_NAME_REGEX = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9 -]+$/

// AI suggestion settings
const MAX_SUGGESTIONS = 3

interface UseTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  createTag: (name: string) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  getAISuggestions: (text: string) => Tag[]
  acceptAISuggestion: (tagId: string) => void
  rejectAISuggestion: (tagId: string) => void
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load tags on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const storedTags = await api.getTags()
        // Sort by createdAt descending
        const sorted = storedTags.sort((a, b) => b.createdAt - a.createdAt)
        setTags(sorted)
      } catch (err) {
        console.error('Failed to load tags:', err)
        setError('Could not load tags')
      } finally {
        setIsLoading(false)
      }
    }
    loadTags()
  }, [])

  const createTag = async (name: string): Promise<Tag> => {
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ')

    // Input validation
    if (!normalizedName) {
      throw new Error('Tag name is required')
    }
    if (normalizedName.length > MAX_TAG_NAME_LENGTH) {
      throw new Error(`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`)
    }
    if (!TAG_NAME_REGEX.test(normalizedName)) {
      throw new Error('Tag name must contain only alphanumeric characters, spaces, and hyphens')
    }

    // Deduplicate by name - if tag with same name exists, return existing
    const existingTag = tags.find(t => t.name.toLowerCase() === normalizedName)
    if (existingTag) {
      return existingTag
    }

    const now = Date.now()
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: now
    }

    try {
      const savedTag = await api.saveTag(newTag)
      setTags(prev => [savedTag, ...prev])
      return savedTag
    } catch (err) {
      console.error('Failed to create tag:', err)
      setError('Could not create tag')
      throw err
    }
  }

  const deleteTag = async (id: string): Promise<void> => {
    // Optimistic delete
    const previousTags = tags
    setTags(prev => prev.filter(t => t.id !== id))
    setError(null)

    try {
      await api.deleteTag(id)
    } catch (err) {
      console.error('Failed to delete tag:', err)
      // Rollback
      setTags(previousTags)
      setError('Could not delete tag')
      throw err
    }
  }

  /**
   * getAISuggestions - Simple keyword matching for tag suggestions
   *
   * Phase 2 placeholder implementation:
   * - Splits input text into words
   * - Matches words against existing tag names
   * - Returns top 3 matching tags
   * - If no matches, suggests the text itself as a potential tag name
   *
   * Phase 4 will integrate real AI for smarter suggestions.
   */
  const getAISuggestions = (text: string): Tag[] => {
    if (!text || text.trim().length === 0) {
      return []
    }

    // Split text into words and filter out short words and common stop words
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length >= 2)

    if (words.length === 0) {
      return []
    }

    // Find tags that match any of the words
    const matchingTags: Array<{ tag: Tag; score: number }> = []

    for (const tag of tags) {
      const tagName = tag.name.toLowerCase()
      let score = 0

      for (const word of words) {
        // Exact match scores highest
        if (tagName === word) {
          score += 10
        }
        // Tag name contains the word
        else if (tagName.includes(word)) {
          score += 5
        }
        // Word is contained in tag name
        else if (tagName.includes(word)) {
          score += 3
        }
      }

      if (score > 0) {
        matchingTags.push({ tag, score })
      }
    }

    // Sort by score descending, then by createdAt descending
    matchingTags.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return b.tag.createdAt - a.tag.createdAt
    })

    // Return top matches
    const suggestions = matchingTags.slice(0, MAX_SUGGESTIONS).map(m => m.tag)

    // TAG-03: If no matches found, the caller can suggest the text itself
    // as a potential tag name (handled by the UI, not here)

    return suggestions
  }

  // acceptAISuggestion and rejectAISuggestion are for managing selected state
  // in TagInput popup - these are placeholder functions that could be
  // extended to track selected suggestions in component state
  const acceptAISuggestion = (tagId: string): void => {
    // Placeholder - UI component manages selected state
    console.log('Accept suggestion:', tagId)
  }

  const rejectAISuggestion = (tagId: string): void => {
    // Placeholder - UI component manages selected state
    console.log('Reject suggestion:', tagId)
  }

  return {
    tags,
    isLoading,
    error,
    createTag,
    deleteTag,
    getAISuggestions,
    acceptAISuggestion,
    rejectAISuggestion
  }
}
