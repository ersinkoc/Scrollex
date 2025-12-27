import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type {
  UseVirtualMasonryOptions,
  UseVirtualMasonryReturn,
  VirtualItem,
  Range,
  ScrollOptions,
  ScrollToIndexOptions,
} from '../../types.js'
import { createKernel } from '../../kernel/kernel.js'

/**
 * Hook for virtualizing a masonry layout.
 * Items are placed in the shortest column, creating a Pinterest-style layout.
 *
 * @param options - Hook configuration
 * @returns Virtual masonry state and methods
 *
 * @example
 * ```tsx
 * function MyMasonry({ items }) {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *
 *   const {
 *     virtualItems,
 *     totalSize,
 *     columnCount,
 *     columnWidth,
 *   } = useVirtualMasonry({
 *     count: items.length,
 *     columns: 3,
 *     getItemHeight: (index, columnWidth) => {
 *       const item = items[index]
 *       return (item.height / item.width) * columnWidth
 *     },
 *     gap: 8,
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
 *               left: virtualItem.lane * (columnWidth + gap),
 *               width: columnWidth,
 *               height: virtualItem.size,
 *             }}
 *           >
 *             <img src={items[virtualItem.index].url} />
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useVirtualMasonry(options: UseVirtualMasonryOptions): UseVirtualMasonryReturn {
  const {
    count,
    columns,
    getItemHeight,
    gap = 0,
    overscan = 5,
    containerRef,
  } = options

  // Create kernel
  const kernelRef = useRef(
    createKernel({
      itemCount: count,
      estimatedItemHeight: 200,
      overscan,
      direction: 'vertical',
    })
  )

  // State
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([])
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [range, setRange] = useState<Range>({
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
  })
  const [columnWidth, setColumnWidth] = useState(0)
  const [columnHeights, setColumnHeights] = useState<number[]>([])
  const [totalSize, setTotalSize] = useState(0)

  // Layout cache
  const layoutCacheRef = useRef<Map<number, { top: number; lane: number; height: number }>>(new Map())

  const kernel = kernelRef.current

  /**
   * Calculate masonry layout.
   */
  const calculateLayout = useCallback((containerWidth: number) => {
    if (containerWidth === 0 || count === 0) {
      setVirtualItems([])
      setColumnHeights([])
      setTotalSize(0)
      return
    }

    const newColumnWidth = (containerWidth - (columns - 1) * gap) / columns
    setColumnWidth(newColumnWidth)

    // Reset column heights
    const heights = new Array(columns).fill(0)
    const cache = new Map<number, { top: number; lane: number; height: number }>()

    // Place each item in the shortest column
    for (let i = 0; i < count; i++) {
      // Find shortest column
      let shortestCol = 0
      for (let j = 1; j < columns; j++) {
        if ((heights[j] ?? 0) < (heights[shortestCol] ?? 0)) {
          shortestCol = j
        }
      }

      const itemHeight = getItemHeight(i, newColumnWidth)
      const top = heights[shortestCol] ?? 0

      cache.set(i, { top, lane: shortestCol, height: itemHeight })

      heights[shortestCol] = top + itemHeight + gap
    }

    layoutCacheRef.current = cache
    setColumnHeights(heights)
    setTotalSize(Math.max(...heights) - gap)
  }, [count, columns, gap, getItemHeight])

  /**
   * Get visible items based on scroll position.
   */
  const getVisibleItems = useCallback((scrollTop: number, viewportHeight: number): VirtualItem[] => {
    const cache = layoutCacheRef.current
    const items: VirtualItem[] = []
    const overscanAmount = overscan * 100 // Rough estimate per item

    const viewStart = Math.max(0, scrollTop - overscanAmount)
    const viewEnd = scrollTop + viewportHeight + overscanAmount

    for (let i = 0; i < count; i++) {
      const layout = cache.get(i)
      if (!layout) continue

      const itemEnd = layout.top + layout.height

      // Check if item is in view
      if (itemEnd >= viewStart && layout.top <= viewEnd) {
        items.push({
          index: i,
          key: i,
          start: layout.top,
          end: itemEnd,
          size: layout.height,
          lane: layout.lane,
        })
      }
    }

    return items
  }, [count, overscan])

  // Initialize
  useEffect(() => {
    // Subscribe to events
    const unsubScrollStart = kernel.on('scroll-start', () => {
      setIsScrolling(true)
    })

    const unsubScrollEnd = kernel.on('scroll-end', () => {
      setIsScrolling(false)
    })

    return () => {
      unsubScrollStart()
      unsubScrollEnd()
      kernel.destroy()
    }
  }, [kernel])

  // Attach to container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    kernel.attach(container)

    // Calculate initial layout
    calculateLayout(container.clientWidth)

    // Handle scroll
    const handleScroll = () => {
      const scrollTop = container.scrollTop
      setScrollOffset(scrollTop)
      setVirtualItems(getVisibleItems(scrollTop, container.clientHeight))
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        calculateLayout(entry.contentRect.width)
        setVirtualItems(getVisibleItems(container.scrollTop, entry.contentRect.height))
      }
    })

    container.addEventListener('scroll', handleScroll, { passive: true })
    resizeObserver.observe(container)

    // Initial visible items
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
      kernel.detach()
    }
  }, [containerRef, kernel, calculateLayout, getVisibleItems])

  // Update layout when count changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    calculateLayout(container.clientWidth)
    setVirtualItems(getVisibleItems(container.scrollTop, container.clientHeight))
  }, [count, containerRef, calculateLayout, getVisibleItems])

  // Scroll methods
  const scrollTo = useCallback(
    (offset: number, scrollOptions?: ScrollOptions) => {
      kernel.scrollTo(offset, scrollOptions)
    },
    [kernel]
  )

  const scrollToIndex = useCallback(
    (index: number, _scrollOptions?: ScrollToIndexOptions) => {
      const layout = layoutCacheRef.current.get(index)
      if (layout) {
        kernel.scrollTo(layout.top)
      }
    },
    [kernel]
  )

  const measureElement = useCallback(
    (_index: number, _element: HTMLElement | null) => {
      // Masonry uses calculated heights, no measurement needed
    },
    []
  )

  const getMeasurement = useCallback(
    (index: number) => {
      return layoutCacheRef.current.get(index)?.height
    },
    []
  )

  const invalidateMeasurement = useCallback((_index: number) => {
    // Trigger recalculation
    const container = containerRef.current
    if (container) {
      calculateLayout(container.clientWidth)
    }
  }, [containerRef, calculateLayout])

  const invalidateAllMeasurements = useCallback(() => {
    const container = containerRef.current
    if (container) {
      calculateLayout(container.clientWidth)
    }
  }, [containerRef, calculateLayout])

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
    columnCount: columns,
    columnWidth,
    columnHeights,
  }
}
