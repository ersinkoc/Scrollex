import type { Plugin, Kernel } from '../../types.js'

/**
 * Drag axis.
 */
export type DragAxis = 'vertical' | 'horizontal'

/**
 * Drop indicator style.
 */
export type DropIndicatorStyle = 'line' | 'gap' | 'none'

/**
 * Drag to reorder plugin options.
 */
export interface DragToReorderOptions {
  /** Whether drag to reorder is enabled */
  enabled?: boolean
  /** Drag axis */
  axis?: DragAxis
  /** Require a drag handle (vs dragging anywhere) */
  handle?: boolean
  /** Auto-scroll when dragging near edges */
  autoScroll?: boolean
  /** Auto-scroll speed (px per frame) */
  autoScrollSpeed?: number
  /** Drop indicator style */
  dropIndicator?: DropIndicatorStyle
  /** Callback when drag starts */
  onDragStart?: (index: number) => void
  /** Callback when drag ends */
  onDragEnd?: (index: number) => void
  /** Callback when reorder occurs */
  onReorder: (fromIndex: number, toIndex: number) => void
  /** Check if an item can be dragged */
  canDrag?: (index: number) => boolean
  /** Check if an item can be dropped at a position */
  canDrop?: (fromIndex: number, toIndex: number) => boolean
}

/**
 * Drag to reorder plugin API.
 */
export interface DragToReorderAPI {
  /** Check if currently dragging */
  isDragging(): boolean
  /** Get the dragged item index */
  getDraggedIndex(): number | null
  /** Get the current drop target index */
  getDropTargetIndex(): number | null
  /** Cancel current drag */
  cancelDrag(): void
  /** Enable drag to reorder */
  enable(): void
  /** Disable drag to reorder */
  disable(): void
  /** Check if enabled */
  isEnabled(): boolean
  /** Create drag handle props */
  getDragHandleProps(index: number): DragHandleProps
}

/**
 * Props for drag handle element.
 */
export interface DragHandleProps {
  draggable: boolean
  onDragStart: (event: DragEvent) => void
  onDragEnd: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDragEnter: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  'data-drag-index': string
  'aria-grabbed': boolean
}

/**
 * Creates a drag to reorder plugin.
 * Enables drag and drop reordering of list items.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { dragToReorder } from '@oxog/scrollex/plugins'
 *
 * const [items, setItems] = useState(initialItems)
 *
 * <VirtualList
 *   data={items}
 *   plugins={[dragToReorder({
 *     onReorder: (fromIndex, toIndex) => {
 *       const newItems = [...items]
 *       const [removed] = newItems.splice(fromIndex, 1)
 *       newItems.splice(toIndex, 0, removed)
 *       setItems(newItems)
 *     },
 *   })]}
 *   renderItem={({ item, index, dragHandleProps }) => (
 *     <Row item={item}>
 *       <DragHandle {...dragHandleProps} />
 *     </Row>
 *   )}
 * />
 * ```
 */
export function dragToReorder(options: DragToReorderOptions): Plugin {
  const {
    enabled: initialEnabled = true,
    axis = 'vertical',
    handle = true,
    autoScroll = true,
    autoScrollSpeed = 10,
    dropIndicator = 'line',
    onDragStart,
    onDragEnd,
    onReorder,
    canDrag = () => true,
    canDrop = () => true,
  } = options

  let kernel: Kernel | null = null
  let enabled = initialEnabled
  let draggedIndex: number | null = null
  let dropTargetIndex: number | null = null
  let autoScrollTimer: ReturnType<typeof setInterval> | null = null

  /**
   * Handle drag start.
   */
  function handleDragStart(event: DragEvent, index: number): void {
    if (!enabled || !canDrag(index)) {
      event.preventDefault()
      return
    }

    draggedIndex = index
    dropTargetIndex = index

    // Set drag data
    event.dataTransfer?.setData('text/plain', String(index))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }

    onDragStart?.(index)

    // Start auto-scroll if enabled
    if (autoScroll) {
      startAutoScroll()
    }
  }

  /**
   * Handle drag end.
   */
  function handleDragEnd(event: DragEvent): void {
    const currentDraggedIndex = draggedIndex
    const currentDropTargetIndex = dropTargetIndex

    stopAutoScroll()

    if (currentDraggedIndex !== null && currentDropTargetIndex !== null && currentDraggedIndex !== currentDropTargetIndex) {
      if (canDrop(currentDraggedIndex, currentDropTargetIndex)) {
        onReorder(currentDraggedIndex, currentDropTargetIndex)
      }
    }

    if (currentDraggedIndex !== null) {
      onDragEnd?.(currentDraggedIndex)
    }

    draggedIndex = null
    dropTargetIndex = null
  }

  /**
   * Handle drag over.
   */
  function handleDragOver(event: DragEvent, index: number): void {
    if (draggedIndex === null) return

    event.preventDefault()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = canDrop(draggedIndex, index) ? 'move' : 'none'
    }

    // Calculate drop position based on mouse position
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    let newDropTarget: number

    if (axis === 'vertical') {
      const midY = rect.top + rect.height / 2
      newDropTarget = event.clientY < midY ? index : index + 1
    } else {
      const midX = rect.left + rect.width / 2
      newDropTarget = event.clientX < midX ? index : index + 1
    }

    // Adjust for the dragged item's original position
    if (newDropTarget > draggedIndex) {
      newDropTarget--
    }

    dropTargetIndex = Math.max(0, Math.min(newDropTarget, (kernel?.getItemCount() ?? 1) - 1))
  }

  /**
   * Handle drag enter.
   */
  function handleDragEnter(event: DragEvent, _index: number): void {
    event.preventDefault()
  }

  /**
   * Handle drag leave.
   */
  function handleDragLeave(_event: DragEvent, _index: number): void {
    // Nothing to do
  }

  /**
   * Handle drop.
   */
  function handleDrop(event: DragEvent, _index: number): void {
    event.preventDefault()
    // Actual reorder happens in dragEnd
  }

  /**
   * Start auto-scrolling.
   */
  function startAutoScroll(): void {
    if (autoScrollTimer) return

    autoScrollTimer = setInterval(() => {
      if (!kernel || draggedIndex === null) {
        stopAutoScroll()
        return
      }

      // Get mouse position from last known position
      // In a real implementation, you'd track mouse position on document mousemove
      // For now, this is a simplified version
    }, 16)
  }

  /**
   * Stop auto-scrolling.
   */
  function stopAutoScroll(): void {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer)
      autoScrollTimer = null
    }
  }

  /**
   * Create drag handle props for an item.
   */
  function getDragHandleProps(index: number): DragHandleProps {
    return {
      draggable: enabled && canDrag(index),
      onDragStart: (event: DragEvent) => handleDragStart(event, index),
      onDragEnd: (event: DragEvent) => handleDragEnd(event),
      onDragOver: (event: DragEvent) => handleDragOver(event, index),
      onDragEnter: (event: DragEvent) => handleDragEnter(event, index),
      onDragLeave: (event: DragEvent) => handleDragLeave(event, index),
      onDrop: (event: DragEvent) => handleDrop(event, index),
      'data-drag-index': String(index),
      'aria-grabbed': draggedIndex === index,
    }
  }

  const api: DragToReorderAPI = {
    isDragging(): boolean {
      return draggedIndex !== null
    },

    getDraggedIndex(): number | null {
      return draggedIndex
    },

    getDropTargetIndex(): number | null {
      return dropTargetIndex
    },

    cancelDrag(): void {
      stopAutoScroll()
      draggedIndex = null
      dropTargetIndex = null
    },

    enable(): void {
      enabled = true
    },

    disable(): void {
      enabled = false
      api.cancelDrag()
    },

    isEnabled(): boolean {
      return enabled
    },

    getDragHandleProps,
  }

  return {
    name: 'drag-to-reorder',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k
    },

    uninstall(): void {
      stopAutoScroll()
      draggedIndex = null
      dropTargetIndex = null
      kernel = null
    },

    api,
  }
}
