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
 * The parts of a drag event the plugin reads. The native DragEvent and React's DragEvent both satisfy it, so
 * the handler props can be spread on a React element.
 */
export interface DragEventLike {
  clientX: number
  clientY: number
  dataTransfer: DataTransfer | null
  currentTarget: EventTarget | null
  preventDefault(): void
}

/**
 * Props for drag handle element.
 */
export interface DragHandleProps {
  draggable: boolean
  onDragStart: (event: DragEventLike) => void
  onDragEnd: (event: DragEventLike) => void
  onDragOver: (event: DragEventLike) => void
  onDragEnter: (event: DragEventLike) => void
  onDragLeave: (event: DragEventLike) => void
  onDrop: (event: DragEventLike) => void
  'data-drag-index': string
  'aria-grabbed': boolean
}

/**
 * The drag in progress, kept per kernel: a plugin created again on a parent re-render (for instance because
 * onDragStart sets state) takes over the drag instead of dropping it.
 */
const dragByKernel = new WeakMap<Kernel, { dragged: number | null; target: number | null }>()

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
 * // Create the plugin once: it keeps the drag in progress, and its api hands out the props for the rows
 * const dnd = useMemo(() => dragToReorder({
 *   onReorder: (fromIndex, toIndex) => setItems((current) => {
 *     const newItems = [...current]
 *     const [removed] = newItems.splice(fromIndex, 1)
 *     newItems.splice(toIndex, 0, removed)
 *     return newItems
 *   }),
 * }), [])
 *
 * <VirtualList
 *   data={items}
 *   itemHeight={48}
 *   plugins={[dnd]}
 *   renderItem={({ item, index, style }) => (
 *     <Row item={item} style={style} {...dnd.api.getDragHandleProps(index)} />
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

  function rememberDrag(): void {
    if (kernel) dragByKernel.set(kernel, { dragged: draggedIndex, target: dropTargetIndex })
  }

  /**
   * Handle drag start.
   */
  function handleDragStart(event: DragEventLike, index: number): void {
    if (!enabled || !canDrag(index)) {
      event.preventDefault()
      return
    }

    draggedIndex = index
    dropTargetIndex = index
    rememberDrag()

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
  function finishDrag(): void {
    const currentDraggedIndex = draggedIndex

    stopAutoScroll()

    if (currentDraggedIndex !== null) {
      onDragEnd?.(currentDraggedIndex)
    }

    draggedIndex = null
    dropTargetIndex = null
    rememberDrag()
  }

  // dragend fires on the source row, which a virtual list may have unmounted, and also fires for
  // cancelled drags; it only finishes the drag. The reorder happens on drop.
  function handleDragEnd(_event: DragEventLike): void {
    finishDrag()
  }

  /**
   * Handle drag over.
   */
  function handleDragOver(event: DragEventLike, index: number): void {
    if (draggedIndex === null) return

    event.preventDefault()

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
    rememberDrag()

    // The drop asks canDrop about this same index (it is what onReorder receives), so the cursor must too
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = canDrop(draggedIndex, dropTargetIndex) ? 'move' : 'none'
    }
  }

  /**
   * Handle drag enter.
   */
  function handleDragEnter(event: DragEventLike, _index: number): void {
    event.preventDefault()
  }

  /**
   * Handle drag leave.
   */
  function handleDragLeave(_event: DragEventLike, _index: number): void {
    // Nothing to do
  }

  /**
   * Handle drop.
   */
  function handleDrop(event: DragEventLike, _index: number): void {
    event.preventDefault()

    const currentDraggedIndex = draggedIndex
    const currentDropTargetIndex = dropTargetIndex

    if (currentDraggedIndex !== null && currentDropTargetIndex !== null && currentDraggedIndex !== currentDropTargetIndex) {
      if (canDrop(currentDraggedIndex, currentDropTargetIndex)) {
        onReorder(currentDraggedIndex, currentDropTargetIndex)
      }
    }

    finishDrag()
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
      onDragStart: (event: DragEventLike) => handleDragStart(event, index),
      onDragEnd: (event: DragEventLike) => handleDragEnd(event),
      onDragOver: (event: DragEventLike) => handleDragOver(event, index),
      onDragEnter: (event: DragEventLike) => handleDragEnter(event, index),
      onDragLeave: (event: DragEventLike) => handleDragLeave(event, index),
      onDrop: (event: DragEventLike) => handleDrop(event, index),
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
      rememberDrag()
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

      const previous = dragByKernel.get(k)
      if (previous && previous.dragged !== null && enabled) {
        draggedIndex = previous.dragged
        dropTargetIndex = previous.target
        if (autoScroll) startAutoScroll()
      } else if (previous) {
        rememberDrag()
      }
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
