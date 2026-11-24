import type { Plugin, Kernel, VirtualItem, Viewport } from '../../types.js'
import { autoColumnCount, normalizeColumnCount } from '../../utils/array.js'

/**
 * Masonry renderer plugin options.
 */
export interface MasonryRendererOptions {
  /** Number of columns or 'auto' for responsive */
  columns: number | 'auto'
  /** Minimum column width for auto columns */
  minColumnWidth?: number
  /** Gap between items */
  gap?: number
  /** Function to get item height based on item data and column width */
  getItemHeight: (index: number, columnWidth: number) => number
  /** Get item key for React reconciliation */
  getItemKey?: (index: number) => string | number
}

/**
 * Masonry renderer plugin API.
 */
export interface MasonryRendererAPI {
  /** Get virtual items to render */
  getVirtualItems(): VirtualItem[]
  /** Get total scroll height */
  getTotalHeight(): number
  /** Get heights of each column */
  getColumnHeights(): number[]
  /** Get the index of the shortest column */
  getShortestColumn(): number
  /** Get the index of the longest column */
  getLongestColumn(): number
  /** Get number of columns */
  getColumnCount(): number
  /** Get column width */
  getColumnWidth(): number
  /** Force recalculation of layout */
  recalculate(): void
}

/**
 * Creates a masonry renderer plugin.
 * Implements Pinterest-style masonry layout with items placed in the shortest column.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { createKernel } from '@oxog/scrollex'
 * import { masonryRenderer } from '@oxog/scrollex/plugins'
 *
 * // The plugin lays items out on a kernel; the VirtualMasonry component does this itself from its props
 * const kernel = createKernel({ itemCount: images.length, estimatedItemHeight: 200 })
 * const masonry = masonryRenderer({
 *   columns: 3,
 *   gap: 8,
 *   getItemHeight: (index, columnWidth) => {
 *     const item = images[index]
 *     return (item.height / item.width) * columnWidth
 *   },
 * })
 * kernel.register(masonry)
 * const items = masonry.api.getVirtualItems()
 * ```
 */
export function masonryRenderer(options: MasonryRendererOptions): Plugin {
  const {
    columns,
    minColumnWidth = 200,
    gap = 0,
    getItemHeight,
    getItemKey = (index) => index,
  } = options

  let kernel: Kernel | null = null
  let virtualItems: VirtualItem[] = []
  let columnCount = typeof columns === 'number' ? normalizeColumnCount(columns) : 1
  let columnWidth = 0
  let columnHeights: number[] = []
  let totalHeight = 0

  // Layout cache: index -> { top, lane, height }
  const layoutCache = new Map<number, { top: number; lane: number; height: number }>()

  /**
   * Calculate column count and width based on container width.
   */
  function calculateColumns(containerWidth: number): void {
    if (typeof columns === 'number') {
      columnCount = normalizeColumnCount(columns)
    } else {
      // Auto columns based on container width
      columnCount = autoColumnCount(containerWidth, minColumnWidth, gap)
    }

    // Calculate column width
    columnWidth = (containerWidth - (columnCount - 1) * gap) / columnCount
  }

  /**
   * Calculate the full masonry layout.
   */
  function calculateLayout(): void {
    if (!kernel) return

    const itemCount = kernel.getItemCount()

    // Reset column heights
    columnHeights = new Array(columnCount).fill(0)
    const itemsInColumn: number[] = new Array(columnCount).fill(0)
    layoutCache.clear()

    // Place each item in the shortest column
    for (let i = 0; i < itemCount; i++) {
      // Find shortest column
      let shortestCol = 0
      for (let j = 1; j < columnCount; j++) {
        if ((columnHeights[j] ?? 0) < (columnHeights[shortestCol] ?? 0)) {
          shortestCol = j
        }
      }

      // A height that is not a finite non-negative number would poison the column heights and the total size
      const measured = getItemHeight(i, columnWidth)
      const itemHeight = Number.isFinite(measured) && measured > 0 ? measured : 0
      const top = columnHeights[shortestCol] ?? 0

      layoutCache.set(i, { top, lane: shortestCol, height: itemHeight })

      columnHeights[shortestCol] = top + itemHeight + gap
      itemsInColumn[shortestCol] = (itemsInColumn[shortestCol] ?? 0) + 1
    }

    // A column's height ends with its last item: the gap added after every item is not part of it (an empty column is 0)
    columnHeights = columnHeights.map((height, column) => ((itemsInColumn[column] ?? 0) > 0 ? height - gap : 0))
    totalHeight = Math.max(...columnHeights, 0)
  }

  /**
   * Get visible items based on scroll position.
   */
  function buildVirtualItems(): VirtualItem[] {
    if (!kernel) return []

    const viewport = kernel.getViewport()
    const scrollPosition = kernel.getScrollPosition()
    const scrollTop = scrollPosition.scrollTop
    const viewportHeight = viewport.height
    const overscan = kernel.getOptions().overscan

    // Estimate overscan in pixels
    const overscanPixels = overscan * 100

    const viewStart = Math.max(0, scrollTop - overscanPixels)
    const viewEnd = scrollTop + viewportHeight + overscanPixels

    const items: VirtualItem[] = []
    const itemCount = kernel.getItemCount()

    for (let i = 0; i < itemCount; i++) {
      const layout = layoutCache.get(i)
      if (!layout) continue

      const itemEnd = layout.top + layout.height

      // Check if item is in view
      if (itemEnd >= viewStart && layout.top <= viewEnd) {
        items.push({
          index: i,
          key: getItemKey(i),
          start: layout.top,
          end: itemEnd,
          size: layout.height,
          lane: layout.lane,
        })
      }
    }

    return items
  }

  /**
   * Recalculate layout.
   */
  function recalculate(): void {
    if (!kernel) return

    const viewport = kernel.getViewport()
    calculateColumns(viewport.width)
    calculateLayout()
    virtualItems = buildVirtualItems()
  }

  const api: MasonryRendererAPI = {
    getVirtualItems(): VirtualItem[] {
      return virtualItems
    },

    getTotalHeight(): number {
      return totalHeight
    },

    getColumnHeights(): number[] {
      return [...columnHeights]
    },

    getShortestColumn(): number {
      if (columnHeights.length === 0) return 0

      let shortest = 0
      for (let i = 1; i < columnHeights.length; i++) {
        if ((columnHeights[i] ?? 0) < (columnHeights[shortest] ?? 0)) {
          shortest = i
        }
      }
      return shortest
    },

    getLongestColumn(): number {
      if (columnHeights.length === 0) return 0

      let longest = 0
      for (let i = 1; i < columnHeights.length; i++) {
        if ((columnHeights[i] ?? 0) > (columnHeights[longest] ?? 0)) {
          longest = i
        }
      }
      return longest
    },

    getColumnCount(): number {
      return columnCount
    },

    getColumnWidth(): number {
      return columnWidth
    },

    recalculate,
  }

  return {
    name: 'masonry-renderer',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k
      recalculate()
    },

    uninstall(): void {
      virtualItems = []
      layoutCache.clear()
      columnHeights = []
      totalHeight = 0
      kernel = null
    },

    hooks: {
      onScroll: () => {
        virtualItems = buildVirtualItems()
      },
      onResize: () => recalculate(),
      onItemsChange: () => recalculate(),
    },

    api,
  }
}
