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
import { rekeyItems } from './items-range.js'

/**
 * True when two item lists describe the same layout (so state need not change).
 */
function sameItems(a: VirtualItem[], b: VirtualItem[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (x.index !== y.index || x.key !== y.key || x.start !== y.start || x.size !== y.size || x.lane !== y.lane) {
      return false
    }
  }
  return true
}

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

  // Latest getItemKey: callers close over their current data, so the plugin must not keep the first one
  const getItemKeyRef = useRef(getItemKey)
  getItemKeyRef.current = getItemKey

  // Create kernel once
  const kernelRef = useRef(
    createKernel({
      itemCount: count,
      estimatedItemHeight,
      overscan,
      direction: horizontal ? 'horizontal' : 'vertical',
      getItemKey,
      paddingStart,
    })
  )

  // State
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([])
  const [isScrolling, setIsScrolling] = useState(false)
  const [kernelTotalSize, setKernelTotalSize] = useState(() => kernelRef.current.getTotalSize())
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
    const plugin = listRendererPlugin({ getItemKey: (index) => getItemKeyRef.current(index) })
    kernel.register(plugin)
    listRendererRef.current = plugin.api as ListRendererAPI

    // Subscribe to events
    const unsubScroll = kernel.on('scroll', (event) => {
      const e = event as ScrollEvent
      setScrollOffset(kernel.getOptions().direction === 'horizontal' ? e.scrollLeft : e.scrollTop)
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
      setKernelTotalSize(kernel.getTotalSize())
    })

    // A new item count or measurement can move offsets and the total size without changing the
    // visible index range, so mirror the layout into state on those events as well.
    const syncLayout = () => {
      const next = listRendererRef.current?.getVirtualItems() ?? []
      setVirtualItems((previous) => (sameItems(previous, next) ? previous : next))
      setKernelTotalSize(kernel.getTotalSize())
    }
    const unsubItemsChange = kernel.on('items-change', syncLayout)
    const unsubItemMeasured = kernel.on('item-measured', syncLayout)

    return () => {
      unsubScroll()
      unsubScrollStart()
      unsubScrollEnd()
      unsubRangeChange()
      unsubItemsChange()
      unsubItemMeasured()
      kernel.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The initial offset belongs to the first mount: a later change of the value must not move the reader
  const initialOffsetAppliedRef = useRef(false)

  // Attach to container when ref is available
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    kernel.attach(container)

    return () => {
      kernel.detach()
    }
  }, [containerRef, kernel]) // eslint-disable-line react-hooks/exhaustive-deps

  // The initial offset is applied once, as soon as there are rows to scroll over (a browser clamps scrollTop to the
  // scrollable range, so applying it to a list that has no content yet would lose it). An offset that only becomes
  // known after mount (0 first, a restored value later) counts, too.
  const hasRows = virtualItems.length > 0
  useEffect(() => {
    if (initialOffset > 0 && hasRows && !initialOffsetAppliedRef.current && containerRef.current) {
      initialOffsetAppliedRef.current = true
      kernel.scrollTo(initialOffset)
    }
  }, [initialOffset, hasRows, kernel, containerRef])

  // Update item count
  useEffect(() => {
    kernel.configure({ itemCount: count })
  }, [count, kernel])

  // Update overscan
  useEffect(() => {
    kernel.configure({ overscan })
  }, [overscan, kernel])

  // Update estimated item size
  useEffect(() => {
    kernel.configure({ estimatedItemHeight })
  }, [estimatedItemHeight, kernel])

  // Update the space before the first item
  useEffect(() => {
    kernel.configure({ paddingStart })
  }, [paddingStart, kernel])

  // Update scroll direction
  useEffect(() => {
    kernel.configure({ direction: horizontal ? 'horizontal' : 'vertical' })
  }, [horizontal, kernel])

  // Set up ResizeObserver for measurements
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const index = parseInt(element.dataset['virtualIndex'] ?? '', 10)

        if (!isNaN(index)) {
          const horizontalList = kernel.getOptions().direction === 'horizontal'
          // The border box, like the measurement taken when the row is attached: contentRect leaves out padding and border
          const borderBox = entry.borderBoxSize?.[0]
          let size = borderBox ? (horizontalList ? borderBox.inlineSize : borderBox.blockSize) : 0
          if (!(size > 0)) {
            const box = element.getBoundingClientRect()
            size = horizontalList ? box.width : box.height
          }
          if (!(size > 0)) size = horizontalList ? entry.contentRect.width : entry.contentRect.height

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
  }, [kernel])

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

  // Total size with padding
  const totalSize = kernelTotalSize + paddingEnd

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
  }
}
