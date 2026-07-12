import { useEffect, useRef } from 'react'

export function useDismissableLayer<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const layerRef = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(event.target as Node)) closeRef.current()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return layerRef
}
