import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type {
  UseVirtualListOptions,
  UseVirtualListReturn,
  VirtualItem,
  Range,
  ScrollOptions,
  ScrollToIndexOptions,
  ScrollEvent,
  VisibleRangeChangeEvent,
} from '../../types.js'
import { createKernel } from '../../kernel/kernel.js'
import { listRendererPlugin } from '../../plugins/core/list-renderer.js'
import type { ListRendererAPI } from '../../plugins/core/list-renderer.js'

/**
 * Hook for virtualizing a list.
 * Provides all the primitives needed to build a virtualized list.
 *
 * @param options - Hook configuration
 * @returns Virtual list state and methods
 *
 * @example
 * ```tsx
 * function MyList({ items }) {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *
 *   const {
 *     virtualItems,
 *     totalSize,
 *     scrollToIndex,
 *   } = useVirtualList({
 *     count: items.length,
 *     estimatedItemHeight: 50,
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
export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const {
    count,
    getItemHeight,
    estimatedItemHeight = 50,
    overscan = 5,
    paddingStart = 0,
    paddingEnd = 0,
    initialOffset = 0,
    getItemKey = (index) => index,
    horizontal = false,
    containerRef,
  } = options

  // Create kernel once
  const kernelRef = useRef(
    createKernel({
      itemCount: count,
      estimatedItemHeight,
      overscan,
      direction: horizontal ? 'horizontal' : 'vertical',
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

  // List renderer plugin ref
  const listRendererRef = useRef<ListRendererAPI | null>(null)

  // Measurement refs for ResizeObserver
  const measurementRefs = useRef<Map<number, HTMLElement>>(new Map())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Get kernel
  const kernel = kernelRef.current

  // Initialize plugins and attach to container
  useEffect(() => {
    // Register list renderer plugin
    const plugin = listRendererPlugin({ getItemKey })
    kernel.register(plugin)
    listRendererRef.current = plugin.api as ListRendererAPI

    // Subscribe to events
    const unsubScroll = kernel.on('scroll', (event) => {
      const e = event as ScrollEvent
      setScrollOffset(horizontal ? e.scrollLeft : e.scrollTop)
    })

    const unsubScrollStart = kernel.on('scroll-start', () => {
      setIsScrolling(true)
    })

    const unsubScrollEnd = kernel.on('scroll-end', () => {
      setIsScrolling(false)
    })

    const unsubRangeChange = kernel.on('visible-range-change', (event) => {
      const e = event as VisibleRangeChangeEvent
      setRange(e.range)
      setVirtualItems(listRendererRef.current?.getVirtualItems() ?? [])
    })

    return () => {
      unsubScroll()
      unsubScrollStart()
      unsubScrollEnd()
      unsubRangeChange()
      kernel.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach to container when ref is available
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    kernel.attach(container)

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
  }, [count, kernel])

  // Update overscan
  useEffect(() => {
    kernel.configure({ overscan })
  }, [overscan, kernel])

  // Set up ResizeObserver for measurements
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const index = parseInt(element.dataset['virtualIndex'] ?? '', 10)

        if (!isNaN(index)) {
          const rect = entry.contentRect
          const size = horizontal ? rect.width : rect.height

          if (size > 0) {
            kernel.measureItem(index, size)
          }
        }
      }
    })

    resizeObserverRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [kernel, horizontal])

  // Measure element callback
  const measureElement = useCallback(
    (index: number, element: HTMLElement | null) => {
      const observer = resizeObserverRef.current
      const refs = measurementRefs.current

      // Clean up old ref
      const oldElement = refs.get(index)
      if (oldElement && oldElement !== element) {
        observer?.unobserve(oldElement)
        refs.delete(index)
      }

      // Set up new ref
      if (element) {
        element.dataset['virtualIndex'] = String(index)
        refs.set(index, element)
        observer?.observe(element)

        // Initial measurement
        if (getItemHeight) {
          const size = getItemHeight(index)
          kernel.measureItem(index, size)
        } else {
          const rect = element.getBoundingClientRect()
          const size = horizontal ? rect.width : rect.height
          if (size > 0) {
            kernel.measureItem(index, size)
          }
        }
      }
    },
    [kernel, horizontal, getItemHeight]
  )

  // Scroll methods
  const scrollTo = useCallback(
    (offset: number, scrollOptions?: ScrollOptions) => {
      kernel.scrollTo(offset, scrollOptions)
    },
    [kernel]
  )

  const scrollToIndex = useCallback(
    (index: number, scrollOptions?: ScrollToIndexOptions) => {
      kernel.scrollToIndex(index, scrollOptions)
    },
    [kernel]
  )

  // Measurement methods
  const getMeasurement = useCallback(
    (index: number) => kernel.getCachedHeight(index),
    [kernel]
  )

  const invalidateMeasurement = useCallback(
    (index: number) => kernel.invalidateMeasurement(index),
    [kernel]
  )

  const invalidateAllMeasurements = useCallback(
    () => kernel.invalidateAllMeasurements(),
    [kernel]
  )

  // Calculate total size with padding
  const totalSize = useMemo(() => {
    return paddingStart + kernel.getTotalSize() + paddingEnd
  }, [kernel, paddingStart, paddingEnd, virtualItems]) // virtualItems triggers recalc

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
  }
}
