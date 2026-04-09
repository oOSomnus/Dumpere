import { useEffect, useState } from 'react'
import { mockElectronAPI } from '../lib/types'

const api = typeof window !== 'undefined' && window.electronAPI
  ? window.electronAPI
  : mockElectronAPI

export function useFileUrl(storedPath: string | null | undefined): string | null {
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!storedPath) {
      setFileUrl(null)
      return
    }

    void api.getFileUrl(storedPath).then((resolvedUrl) => {
      if (!cancelled) {
        setFileUrl(resolvedUrl)
      }
    }).catch(() => {
      if (!cancelled) {
        setFileUrl(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [storedPath])

  return fileUrl
}
