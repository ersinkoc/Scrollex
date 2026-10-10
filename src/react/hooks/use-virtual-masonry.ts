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
import { normalizeColumnCount, normalizeOverscan } from '../../utils/array.js'
import { getContentWidth } from '../../utils/rect.js'
import { getItemsRange } from './items-range.js'

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
    minColumnWidth = 200,
    getItemHeight,
    gap = 0,
    overscan = 5,
    initialOffset = 0,
    getItemKey = (index) => index,
    containerRef,
  } = options

  const gapX = typeof gap === 'number' ? gap : gap.x
  const gapY = typeof gap === 'number' ? gap : gap.y

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
  const [columnCount, setColumnCount] = useState(typeof columns === 'number' ? normalizeColumnCount(columns) : 1)
  const [columnWidth, setColumnWidth] = useState(0)
  const [columnHeights, setColumnHeights] = useState<number[]>([])
  const [totalSize, setTotalSize] = useState(0)

  // Layout cache
  const layoutCacheRef = useRef<Map<number, { top: number; lane: number; height: number }>>(new Map())

  // Latest getItemHeight; read via ref so a new callback identity does not re-run layout effects
  const getItemHeightRef = useRef(getItemHeight)
  getItemHeightRef.current = getItemHeight

  // Latest getItemKey: callers close over their current data
  const getItemKeyRef = useRef(getItemKey)
  getItemKeyRef.current = getItemKey

  // The initial offset applies once, not every time the layout effect re-runs
  const initialOffsetAppliedRef = useRef(false)

  const kernel = kernelRef.current

  /**
   * Calculate masonry layout.
   */
  const calculateLayout = useCallback((containerWidth: number) => {
    // Plugins run on this kernel: it needs the item count (it is not otherwise told)
    kernel.configure({ itemCount: count })

    if (containerWidth === 0 || count === 0) {
      setVirtualItems([])
      setColumnHeights([])
      setTotalSize(0)
      return
    }

    const columnTotal = columns === 'auto'
      ? Math.max(1, Math.floor((containerWidth + gapX) / (minColumnWidth + gapX)))
      : normalizeColumnCount(columns)
    const newColumnWidth = (containerWidth - (columnTotal - 1) * gapX) / columnTotal
    setColumnCount(columnTotal)
    setColumnWidth(newColumnWidth)

    // Reset column heights
    const heights = new Array(columnTotal).fill(0)
    const cache = new Map<number, { top: number; lane: number; height: number }>()

    // Place each item in the shortest column
    for (let i = 0; i < count; i++) {
      // Find shortest column
      let shortestCol = 0
      for (let j = 1; j < columnTotal; j++) {
        if ((heights[j] ?? 0) < (heights[shortestCol] ?? 0)) {
          shortestCol = j
        }
      }

      // (a height that is not a finite non-negative number would poison the column heights and the total size)
      const measured = getItemHeightRef.current(i, newColumnWidth)
      const itemHeight = Number.isFinite(measured) && measured > 0 ? measured : 0
      const top = heights[shortestCol] ?? 0

      cache.set(i, { top, lane: shortestCol, height: itemHeight })

      heights[shortestCol] = top + itemHeight + gapY
    }

    layoutCacheRef.current = cache
    setColumnHeights(heights)
    const total = Math.max(...heights) - gapY
    setTotalSize(total)
    // ... and a total size that matches the layout (the kernel does not know the columns)
    kernel.configure({ estimatedItemHeight: total / count })
  }, [kernel, count, columns, minColumnWidth, gapX, gapY])

  /**
   * Get visible items based on scroll position.
   */
  const getVisibleItems = useCallback((scrollTop: number, viewportHeight: number): VirtualItem[] => {
    const cache = layoutCacheRef.current
    const items: VirtualItem[] = []
    const overscanAmount = normalizeOverscan(overscan) * 100 // Rough estimate per item

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
          key: getItemKeyRef.current(i),
          start: layout.top,
          end: itemEnd,
          size: layout.height,
          lane: layout.lane,
        })
      }
    }

    return items
  }, [count, overscan])

  /**
   * Publish visible items and the range they cover.
   */
  const updateVisibleItems = useCallback((scrollTop: number, viewportHeight: number) => {
    const items = getVisibleItems(scrollTop, viewportHeight)
    setVirtualItems(items)
    setRange(getItemsRange(items, scrollTop, viewportHeight))
  }, [getVisibleItems])

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

  // Attach the kernel to the container once; a new layout callback must not detach it (that would cancel a running scroll animation)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    kernel.attach(container)

    return () => {
      kernel.detach()
    }
  }, [containerRef, kernel])

  // Layout, scroll and resize handling; re-subscribes when the layout inputs change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Calculate initial layout
    calculateLayout(getContentWidth(container))

    // Handle scroll
    const handleScroll = () => {
      const scrollTop = container.scrollTop
      setScrollOffset(scrollTop)
      updateVisibleItems(scrollTop, container.clientHeight)
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        calculateLayout(entry.contentRect.width)
        updateVisibleItems(container.scrollTop, entry.contentRect.height)
      }
    })

    container.addEventListener('scroll', handleScroll, { passive: true })
    resizeObserver.observe(container)

    // Initial visible items
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [containerRef, kernel, calculateLayout, updateVisibleItems])

  // The initial offset is applied once, as soon as the content has a height (a browser clamps scrollTop to the
  // scrollable range, so applying it before the layout ran would lose it). The first mount only: a later change
  // of the value must not move the reader; a value that only becomes known after mount (a restored one) counts.
  useEffect(() => {
    if (initialOffset > 0 && totalSize > 0 && !initialOffsetAppliedRef.current && containerRef.current) {
      initialOffsetAppliedRef.current = true
      kernel.scrollTo(initialOffset)
    }
  }, [initialOffset, totalSize, kernel, containerRef])

  // Update layout when count changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    calculateLayout(getContentWidth(container))
    updateVisibleItems(container.scrollTop, container.clientHeight)
  }, [count, containerRef, calculateLayout, updateVisibleItems])

  // Scroll methods
  const scrollTo = useCallback(
    (offset: number, scrollOptions?: ScrollOptions) => {
      kernel.scrollTo(offset, scrollOptions)
    },
    [kernel]
  )

  const scrollToIndex = useCallback(
    (index: number, scrollOptions: ScrollToIndexOptions = {}) => {
      const layout = layoutCacheRef.current.get(index)
      const container = containerRef.current
      if (!layout || !container) return

      const { align = 'auto', offset: additionalOffset = 0, ...options } = scrollOptions
      const viewportHeight = container.clientHeight
      const itemEnd = layout.top + layout.height
      let targetOffset: number

      switch (align) {
        case 'start':
          targetOffset = layout.top
          break
        case 'center':
          targetOffset = layout.top - viewportHeight / 2 + layout.height / 2
          break
        case 'end':
          targetOffset = itemEnd - viewportHeight
          break
        case 'auto':
        default: {
          const visibleStart = container.scrollTop
          if (layout.top < visibleStart) {
            targetOffset = layout.top
          } else if (itemEnd > visibleStart + viewportHeight) {
            targetOffset = itemEnd - viewportHeight
          } else {
            return
          }
          break
        }
      }

      const maxScroll = Math.max(0, container.scrollHeight - viewportHeight)
      kernel.scrollTo(Math.max(0, Math.min(targetOffset + additionalOffset, maxScroll)), options)
    },
    [kernel, containerRef]
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
      calculateLayout(getContentWidth(container))
      updateVisibleItems(container.scrollTop, container.clientHeight)
    }
  }, [containerRef, calculateLayout, updateVisibleItems])

  const invalidateAllMeasurements = useCallback(() => {
    const container = containerRef.current
    if (container) {
      calculateLayout(getContentWidth(container))
      updateVisibleItems(container.scrollTop, container.clientHeight)
    }
  }, [containerRef, calculateLayout, updateVisibleItems])

  // The state is refreshed in an effect after the count changed: never hand out items beyond the data
  const currentItems = useMemo(
    () => (virtualItems.some((item) => item.index >= count) ? virtualItems.filter((item) => item.index < count) : virtualItems),
    [virtualItems, count]
  )

  return {
    virtualItems: currentItems,
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
    columnHeights,
  }
}
