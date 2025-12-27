import type { Plugin, Kernel, VirtualItem, Range, GridGap } from '../../types.js'

/**
 * Grid renderer plugin options.
 */
export interface GridRendererOptions {
  /** Number of columns or 'auto' for responsive */
  columns: number | 'auto'
  /** Minimum column width for auto columns */
  minColumnWidth?: number
  /** Row height */
  rowHeight: number
  /** Gap between items */
  gap?: number | GridGap
  /** Get item key for React reconciliation */
  getItemKey?: (index: number) => string | number
}

/**
 * Grid renderer plugin API.
 */
export interface GridRendererAPI {
  /** Get virtual items to render */
  getVirtualItems(): VirtualItem[]
  /** Get total scroll height */
  getTotalHeight(): number
  /** Get number of columns */
  getColumnCount(): number
  /** Get column width */
  getColumnWidth(): number
  /** Get number of items per row */
  getItemsPerRow(): number
  /** Get row count */
  getRowCount(): number
  /** Force recalculation */
  recalculate(): void
}

/**
 * Creates a grid renderer plugin.
 * Handles multi-column grid virtualization.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function gridRendererPlugin(options: GridRendererOptions): Plugin {
  const {
    columns,
    minColumnWidth = 100,
    rowHeight,
    gap = 0,
    getItemKey = (index) => index,
  } = options

  let kernel: Kernel | null = null
  let virtualItems: VirtualItem[] = []
  let columnCount = typeof columns === 'number' ? columns : 1
  let columnWidth = 0
  let gapX = typeof gap === 'number' ? gap : gap.x
  let gapY = typeof gap === 'number' ? gap : gap.y

  /**
   * Calculate column count and width based on container width.
   */
  function calculateColumns(containerWidth: number): void {
    if (typeof columns === 'number') {
      columnCount = columns
    } else {
      // Auto columns based on container width
      columnCount = Math.max(1, Math.floor((containerWidth + gapX) / (minColumnWidth + gapX)))
    }

    // Calculate column width
    columnWidth = (containerWidth - (columnCount - 1) * gapX) / columnCount
  }

  /**
   * Get row index for an item index.
   */
  function getRowIndex(itemIndex: number): number {
    return Math.floor(itemIndex / columnCount)
  }

  /**
   * Get column index for an item index.
   */
  function getColumnIndex(itemIndex: number): number {
    return itemIndex % columnCount
  }

  /**
   * Get the row count.
   */
  function getRowCount(): number {
    if (!kernel) return 0
    return Math.ceil(kernel.getItemCount() / columnCount)
  }

  /**
   * Build virtual items from the visible range.
   */
  function buildVirtualItems(): VirtualItem[] {
    if (!kernel) return []

    const viewport = kernel.getViewport()
    const scrollPosition = kernel.getScrollPosition()
    const scrollTop = scrollPosition.scrollTop

    // Calculate row height with gap
    const effectiveRowHeight = rowHeight + gapY

    // Calculate visible row range
    const startRow = Math.max(0, Math.floor(scrollTop / effectiveRowHeight))
    const visibleRows = Math.ceil(viewport.height / effectiveRowHeight)
    const overscan = kernel.getOptions().overscan
    const endRow = Math.min(getRowCount() - 1, startRow + visibleRows + overscan)
    const overscanStartRow = Math.max(0, startRow - overscan)

    const items: VirtualItem[] = []
    const itemCount = kernel.getItemCount()

    for (let row = overscanStartRow; row <= endRow; row++) {
      for (let col = 0; col < columnCount; col++) {
        const index = row * columnCount + col
        if (index >= itemCount) break

        const top = row * effectiveRowHeight
        const left = col * (columnWidth + gapX)

        items.push({
          index,
          key: getItemKey(index),
          start: top,
          end: top + rowHeight,
          size: rowHeight,
          lane: col,
        })
      }
    }

    return items
  }

  /**
   * Recalculate grid layout.
   */
  function recalculate(): void {
    if (!kernel) return

    const viewport = kernel.getViewport()
    calculateColumns(viewport.width)
    virtualItems = buildVirtualItems()
  }

  const api: GridRendererAPI = {
    getVirtualItems(): VirtualItem[] {
      return virtualItems
    },

    getTotalHeight(): number {
      return getRowCount() * (rowHeight + gapY) - gapY
    },

    getColumnCount(): number {
      return columnCount
    },

    getColumnWidth(): number {
      return columnWidth
    },

    getItemsPerRow(): number {
      return columnCount
    },

    getRowCount,

    recalculate,
  }

  return {
    name: 'grid-renderer',
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
      onScroll: () => {
        virtualItems = buildVirtualItems()
      },
      onResize: () => recalculate(),
      onItemsChange: () => recalculate(),
    },

    api,
  }
}
