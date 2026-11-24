import type { Plugin, Kernel, VirtualItem, Range } from '../../types.js'

/**
 * List renderer plugin options.
 */
export interface ListRendererOptions {
  /** Get item key for React reconciliation */
  getItemKey?: (index: number) => string | number
}

/**
 * List renderer plugin API.
 */
export interface ListRendererAPI {
  /** Get virtual items to render */
  getVirtualItems(): VirtualItem[]
  /** Get total scroll height */
  getTotalHeight(): number
  /** Get start offset (for positioning) */
  getStartOffset(): number
  /** Get end offset */
  getEndOffset(): number
  /** Check if an item is visible */
  isItemVisible(index: number): boolean
  /** Force recalculation */
  recalculate(): void
}

/**
 * Creates a list renderer plugin.
 * This is the core virtualization engine for list rendering.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function listRendererPlugin(options: ListRendererOptions = {}): Plugin {
  const { getItemKey = (index) => index } = options

  let kernel: Kernel | null = null
  let virtualItems: VirtualItem[] = []
  let currentRange: Range = {
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
  }

  /**
   * Build virtual items from the current range.
   */
  function buildVirtualItems(range: Range): VirtualItem[] {
    if (!kernel) return []

    // Build fresh items: arrays already returned by getVirtualItems() may still be held by callers
    const items: VirtualItem[] = []
    const visibleStart = range.startIndex
    const visibleEnd = range.endIndex

    // Never build items past the real item count (an empty list has none; the range may be stale)
    const lastIndex = Math.min(range.overscanEndIndex, kernel.getItemCount() - 1)

    for (let i = range.overscanStartIndex; i <= lastIndex; i++) {
      const offset = kernel.getItemOffset(i)
      const size = kernel.getCachedHeight(i) ?? kernel.getEstimatedHeight()

      items.push({
        index: i,
        key: getItemKey(i),
        start: offset,
        end: offset + size,
        size,
        lane: 0, // For list, always lane 0
      })
    }

    return items
  }

  /**
   * Recalculate virtual items.
   */
  function recalculate(): void {
    if (!kernel) return

    currentRange = kernel.getVisibleRange()
    virtualItems = buildVirtualItems(currentRange)
  }

  const api: ListRendererAPI = {
    getVirtualItems(): VirtualItem[] {
      return virtualItems
    },

    getTotalHeight(): number {
      return kernel?.getTotalSize() ?? 0
    },

    getStartOffset(): number {
      if (virtualItems.length === 0) return 0
      return virtualItems[0]?.start ?? 0
    },

    getEndOffset(): number {
      if (virtualItems.length === 0) return 0
      const lastItem = virtualItems[virtualItems.length - 1]
      return lastItem?.end ?? 0
    },

    isItemVisible(index: number): boolean {
      // An empty list reports the range 0..0, which is not an item
      if (!kernel || index >= kernel.getItemCount()) return false
      return index >= currentRange.startIndex && index <= currentRange.endIndex
    },

    recalculate,
  }

  return {
    name: 'list-renderer',
    version: '1.0.0',
    type: 'core',

    install(k: Kernel): void {
      kernel = k
      recalculate()
    },

    uninstall(): void {
      virtualItems = []
      kernel = null
    },

    hooks: {
      onScroll: () => recalculate(),
      onResize: () => recalculate(),
      onItemMeasured: () => recalculate(),
      onVisibleRangeChange: (range) => {
        currentRange = range
        virtualItems = buildVirtualItems(range)
      },
      onItemsChange: () => recalculate(),
    },

    api,
  }
}
