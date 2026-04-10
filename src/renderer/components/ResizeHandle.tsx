import { MouseEvent } from 'react'

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  onDragStart: (e: MouseEvent) => void
}

/**
 * Invisible 4px drag-to-resize hit area.
 * - horizontal: right edge of sidebar (col-resize cursor)
 * - vertical: top edge of input area (row-resize cursor)
 */
export function ResizeHandle({ direction, onDragStart }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      onMouseDown={onDragStart}
      style={{
        position: 'absolute',
        zIndex: 40,
        userSelect: 'none',
        touchAction: 'none',
        // Slightly oversized hit area so the edge is easier to grab.
        ...(isHorizontal
          ? {
              top: 0,
              bottom: 0,
              right: '-3px',
              width: '8px',
              cursor: 'col-resize',
            }
          : {
              left: 0,
              right: 0,
              top: '-3px',
              height: '8px',
              cursor: 'row-resize',
            }),
        backgroundColor: 'transparent',
      }}
    />
  )
}
