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
 * Object pool for VirtualItem reuse.
 */
class VirtualItemPool {
  private pool: VirtualItem[] = []

  acquire(): VirtualItem {
    const item = this.pool.pop()
    if (item) {
      return item
    }
    return { index: 0, key: 0, start: 0, end: 0, size: 0, lane: 0 }
  }

  release(item: VirtualItem): void {
    item.index = 0
    item.key = 0
    item.start = 0
    item.end = 0
    item.size = 0
    item.lane = 0
    this.pool.push(item)
  }

  releaseAll(items: VirtualItem[]): void {
    for (const item of items) {
      this.release(item)
    }
  }
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
  const itemPool = new VirtualItemPool()

  /**
   * Build virtual items from the current range.
   */
  function buildVirtualItems(range: Range): VirtualItem[] {
    if (!kernel) return []

    // Release old items back to pool
    itemPool.releaseAll(virtualItems)

    const items: VirtualItem[] = []
    const visibleStart = range.startIndex
    const visibleEnd = range.endIndex

    for (let i = range.overscanStartIndex; i <= range.overscanEndIndex; i++) {
      const item = itemPool.acquire()
      const offset = kernel.getItemOffset(i)
      const size = kernel.getCachedHeight(i) ?? kernel.getEstimatedHeight()

      item.index = i
      item.key = getItemKey(i)
      item.start = offset
      item.end = offset + size
      item.size = size
      item.lane = 0 // For list, always lane 0

      items.push(item)
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
      itemPool.releaseAll(virtualItems)
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
