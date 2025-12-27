import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type {
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  VirtualItem,
  Range,
  ScrollOptions,
  ScrollToIndexOptions,
  GridGap,
  ScrollEvent,
  VisibleRangeChangeEvent,
} from '../../types.js'
import { createKernel } from '../../kernel/kernel.js'
import { gridRendererPlugin } from '../../plugins/core/grid-renderer.js'
import type { GridRendererAPI } from '../../plugins/core/grid-renderer.js'

/**
 * Hook for virtualizing a grid.
 * Provides all the primitives needed to build a virtualized grid.
 *
 * @param options - Hook configuration
 * @returns Virtual grid state and methods
 *
 * @example
 * ```tsx
 * function MyGrid({ items }) {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *
 *   const {
 *     virtualItems,
 *     totalSize,
 *     columnCount,
 *     columnWidth,
 *   } = useVirtualGrid({
 *     count: items.length,
 *     columns: 4,
 *     rowHeight: 200,
 *     gap: 16,
 *     containerRef,
 *   })
 *
 *   return (
 *     <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
 *       <div style={{ height: totalSize, position: 'relative' }}>
 *         {virtualItems.map((virtualItem) => (
 *           <div
 *             key={virtualItem.key}
 *             style={{
 *               position: 'absolute',
 *               top: virtualItem.start,
 *               left: virtualItem.lane * (columnWidth + gapX),
 *               width: columnWidth,
 *               height: virtualItem.size,
 *             }}
 *           >
 *             {items[virtualItem.index].name}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const {
    count,
    columns,
    rowHeight,
    gap = 0,
    overscan = 2,
    initialOffset = 0,
    getItemKey = (index) => index,
    containerRef,
  } = options

  // Normalize gap
  const gapX = typeof gap === 'number' ? gap : gap.x
  const gapY = typeof gap === 'number' ? gap : gap.y

  // Create kernel once
  const kernelRef = useRef(
    createKernel({
      itemCount: count,
      estimatedItemHeight: rowHeight,
      overscan,
      direction: 'vertical',
      getItemKey,
    })
  )

  // State
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([])
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(initialOffset)
  const [range, setRange] = useState<Range>({
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
  })
  const [columnCount, setColumnCount] = useState(typeof columns === 'number' ? columns : 1)
  const [columnWidth, setColumnWidth] = useState(0)

  // Grid renderer plugin ref
  const gridRendererRef = useRef<GridRendererAPI | null>(null)

  // Get kernel
  const kernel = kernelRef.current

  // Initialize plugins and attach to container
  useEffect(() => {
    // Register grid renderer plugin
    const plugin = gridRendererPlugin({
      columns,
      rowHeight,
      gap: { x: gapX, y: gapY },
      getItemKey,
    })
    kernel.register(plugin)
    gridRendererRef.current = plugin.api as GridRendererAPI

    // Subscribe to events
    const unsubScroll = kernel.on('scroll', (event) => {
      const e = event as ScrollEvent
      setScrollOffset(e.scrollTop)
      setVirtualItems(gridRendererRef.current?.getVirtualItems() ?? [])
    })

    const unsubScrollStart = kernel.on('scroll-start', () => {
      setIsScrolling(true)
    })

    const unsubScrollEnd = kernel.on('scroll-end', () => {
      setIsScrolling(false)
    })

    const unsubResize = kernel.on('resize', () => {
      const api = gridRendererRef.current
      if (api) {
        api.recalculate()
        setColumnCount(api.getColumnCount())
        setColumnWidth(api.getColumnWidth())
        setVirtualItems(api.getVirtualItems())
      }
    })

    const unsubRangeChange = kernel.on('visible-range-change', (event) => {
      const e = event as VisibleRangeChangeEvent
      setRange(e.range)
    })

    return () => {
      unsubScroll()
      unsubScrollStart()
      unsubScrollEnd()
      unsubResize()
      unsubRangeChange()
      kernel.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach to container when ref is available
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    kernel.attach(container)

    // Initial calculation
    const api = gridRendererRef.current
    if (api) {
      api.recalculate()
      setColumnCount(api.getColumnCount())
      setColumnWidth(api.getColumnWidth())
      setVirtualItems(api.getVirtualItems())
    }

    // Initial scroll if specified
    if (initialOffset > 0) {
      kernel.scrollTo(initialOffset)
    }

    return () => {
      kernel.detach()
    }
  }, [containerRef, kernel, initialOffset])

  // Update item count
  useEffect(() => {
    kernel.configure({ itemCount: count })
    const api = gridRendererRef.current
    if (api) {
      api.recalculate()
      setVirtualItems(api.getVirtualItems())
    }
  }, [count, kernel])

  // Scroll methods
  const scrollTo = useCallback(
    (offset: number, scrollOptions?: ScrollOptions) => {
      kernel.scrollTo(offset, scrollOptions)
    },
    [kernel]
  )

  const scrollToIndex = useCallback(
    (index: number, scrollOptions?: ScrollToIndexOptions) => {
      // For grid, we need to calculate row
      const row = Math.floor(index / columnCount)
      const rowOffset = row * (rowHeight + gapY)
      kernel.scrollTo(rowOffset, scrollOptions)
    },
    [kernel, columnCount, rowHeight, gapY]
  )

  // Measurement methods (not typically used for fixed grid)
  const measureElement = useCallback(
    (_index: number, _element: HTMLElement | null) => {
      // Grid uses fixed heights, no measurement needed
    },
    []
  )

  const getMeasurement = useCallback(
    (_index: number) => rowHeight,
    [rowHeight]
  )

  const invalidateMeasurement = useCallback(
    (_index: number) => {
      // No-op for fixed grid
    },
    []
  )

  const invalidateAllMeasurements = useCallback(() => {
    // No-op for fixed grid
  }, [])

  // Calculate total size
  const totalSize = useMemo(() => {
    return gridRendererRef.current?.getTotalHeight() ?? 0
  }, [virtualItems]) // virtualItems triggers recalc

  // Row count
  const rowCount = useMemo(() => {
    return gridRendererRef.current?.getRowCount() ?? 0
  }, [count, columnCount])

  return {
    virtualItems,
    totalSize,
    scrollOffset,
    isScrolling,
    scrollTo,
    scrollToIndex,
    measureElement,
    range,
    getMeasurement,
    invalidateMeasurement,
    invalidateAllMeasurements,
    columnCount,
    columnWidth,
    rowCount,
  }
}
