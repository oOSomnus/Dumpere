import { useEffect, useState } from 'react'
import { getElectronAPI } from '../lib/electron-api'

export function useFileUrl(storedPath: string | null | undefined): string | null {
  const api = getElectronAPI()
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!storedPath) {
      setFileUrl(null)
      return
    }

    void api.files.getFileUrl(storedPath).then((resolvedUrl) => {
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
