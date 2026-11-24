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
} from '../../types.js'
import { createKernel } from '../../kernel/kernel.js'
import { normalizeColumnCount } from '../../utils/array.js'
import { getContentWidth } from '../../utils/rect.js'
import { getItemsRange, rekeyItems } from './items-range.js'
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
    minColumnWidth,
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

  // Latest getItemKey: callers close over their current data, so the plugin must not keep the first one
  const getItemKeyRef = useRef(getItemKey)
  getItemKeyRef.current = getItemKey

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
  const [columnCount, setColumnCount] = useState(typeof columns === 'number' ? normalizeColumnCount(columns) : 1)
  const [columnWidth, setColumnWidth] = useState(0)

  // Grid renderer plugin ref
  const gridRendererRef = useRef<GridRendererAPI | null>(null)

  // Get kernel
  const kernel = kernelRef.current

  /**
   * Publish items and the range they cover. The kernel's own range counts items as rows, so it is
   * not used for grids.
   */
  const publishItems = useCallback((items: VirtualItem[]) => {
    setVirtualItems(items)
    setRange(getItemsRange(items, kernel.getScrollPosition().scrollTop, kernel.getViewport().height))

    // Plugins run on this kernel: let its total size be the grid's (its items are cells, not rows)
    // (the kernel's own count: this callback is also held by listeners that were subscribed once, with an old `count`)
    const api = gridRendererRef.current
    const itemCount = kernel.getItemCount()
    if (api && itemCount > 0) kernel.configure({ estimatedItemHeight: api.getTotalHeight() / itemCount })
  }, [kernel])

  // Register grid renderer plugin; re-register when layout options change
  useEffect(() => {
    const plugin = gridRendererPlugin({
      columns,
      minColumnWidth,
      rowHeight,
      gap: { x: gapX, y: gapY },
      getItemKey: (index) => getItemKeyRef.current(index),
      getContainerWidth: () => (containerRef.current ? getContentWidth(containerRef.current) : undefined),
    })
    kernel.register(plugin)
    const api = plugin.api as GridRendererAPI
    gridRendererRef.current = api

    if (containerRef.current) {
      api.recalculate()
      setColumnCount(api.getColumnCount())
      setColumnWidth(api.getColumnWidth())
      publishItems(api.getVirtualItems())
    }

    return () => {
      kernel.unregister(plugin.name)
      gridRendererRef.current = null
    }
  }, [kernel, columns, minColumnWidth, rowHeight, gapX, gapY]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to kernel events
  useEffect(() => {
    const unsubScroll = kernel.on('scroll', (event) => {
      const e = event as ScrollEvent
      setScrollOffset(e.scrollTop)
      const api = gridRendererRef.current
      if (api) {
        // Rebuild here instead of relying on plugin hook order (the plugin may be re-registered later)
        api.recalculate()
        publishItems(api.getVirtualItems())
      }
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
        publishItems(api.getVirtualItems())
      }
    })

    return () => {
      unsubScroll()
      unsubScrollStart()
      unsubScrollEnd()
      unsubResize()
      kernel.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initialOffsetAppliedRef = useRef(false)

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
      publishItems(api.getVirtualItems())
    }

    return () => {
      kernel.detach()
    }
  }, [containerRef, kernel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update item count
  useEffect(() => {
    kernel.configure({ itemCount: count })
    const api = gridRendererRef.current
    if (api) {
      api.recalculate()
      publishItems(api.getVirtualItems())
    }
  }, [count, kernel, publishItems])

  // Update overscan (the grid renderer reads it from the kernel when it builds the items)
  useEffect(() => {
    kernel.configure({ overscan })
    const api = gridRendererRef.current
    if (api && containerRef.current) {
      api.recalculate()
      publishItems(api.getVirtualItems())
    }
  }, [overscan, kernel, publishItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll methods
  const scrollTo = useCallback(
    (offset: number, scrollOptions?: ScrollOptions) => {
      kernel.scrollTo(offset, scrollOptions)
    },
    [kernel]
  )

  const scrollToIndex = useCallback(
    (index: number, scrollOptions: ScrollToIndexOptions = {}) => {
      // For grid, we need to calculate row
      const row = Math.floor(index / columnCount)
      const rowOffset = row * (rowHeight + gapY)
      const container = containerRef.current
      if (!container) return

      const { align = 'auto', offset: additionalOffset = 0, ...options } = scrollOptions
      const viewportHeight = container.clientHeight
      const rowEnd = rowOffset + rowHeight
      let targetOffset: number

      switch (align) {
        case 'start':
          targetOffset = rowOffset
          break
        case 'center':
          targetOffset = rowOffset - viewportHeight / 2 + rowHeight / 2
          break
        case 'end':
          targetOffset = rowEnd - viewportHeight
          break
        case 'auto':
        default: {
          const visibleStart = container.scrollTop
          if (rowOffset < visibleStart) {
            targetOffset = rowOffset
          } else if (rowEnd > visibleStart + viewportHeight) {
            targetOffset = rowEnd - viewportHeight
          } else {
            return
          }
          break
        }
      }

      const maxScroll = Math.max(0, container.scrollHeight - viewportHeight)
      kernel.scrollTo(Math.max(0, Math.min(targetOffset + additionalOffset, maxScroll)), options)
    },
    [kernel, containerRef, columnCount, rowHeight, gapY]
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

  // The initial offset is applied once, as soon as the content has a height (a browser clamps scrollTop to the
  // scrollable range, so applying it before the layout ran would lose it). The first mount only: a later change
  // of the value must not move the reader; a value that only becomes known after mount (a restored one) counts.
  useEffect(() => {
    if (initialOffset > 0 && totalSize > 0 && !initialOffsetAppliedRef.current && containerRef.current) {
      initialOffsetAppliedRef.current = true
      kernel.scrollTo(initialOffset)
    }
  }, [initialOffset, totalSize, kernel, containerRef])

  // Row count
  // (computed from the props: the plugin only knows a new count after the effects ran)
  const rowCount = useMemo(() => Math.ceil(count / Math.max(1, columnCount)), [count, columnCount])

  // Keys follow the caller's current getItemKey (a same-length reorder emits no kernel event)
  const keyedItems = useMemo(
    () => rekeyItems(virtualItems, count, getItemKey),
    [virtualItems, count, getItemKey]
  )

  return {
    virtualItems: keyedItems,
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
    kernel,
    columnCount,
    columnWidth,
    rowCount,
  }
}
