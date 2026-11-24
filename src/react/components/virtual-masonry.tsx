import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useCallback,
  CSSProperties,
} from 'react'
import type {
  VirtualMasonryProps,
  VirtualListHandle,
  MasonryRenderItemProps,
} from '../../types.js'
import { useVirtualMasonry } from '../hooks/use-virtual-masonry.js'
import { useKernelPlugins } from '../hooks/use-kernel-plugins.js'
import { useLoadMoreWhenShort } from '../hooks/use-load-more-when-short.js'
import { ScrollexContext } from '../context.js'

/**
 * A virtualized masonry component that efficiently renders large datasets in a Pinterest-style layout.
 * Items are placed in the shortest column, creating a dynamic masonry effect.
 *
 * @template T - The type of items in the data array
 *
 * @example
 * ```tsx
 * <VirtualMasonry
 *   data={images}
 *   columns={3}
 *   gap={8}
 *   getItemHeight={(item, columnWidth) => (item.height / item.width) * columnWidth}
 *   renderItem={({ item, style, width }) => (
 *     <div style={style}>
 *       <img src={item.url} width={width} />
 *     </div>
 *   )}
 * />
 * ```
 */
function VirtualMasonryInner<T>(
  props: VirtualMasonryProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    data,
    renderItem,
    getItemHeight,
    columns,
    minColumnWidth = 200,
    gap = 0,
    height = '100%',
    width = '100%',
    overscan = 5,
    initialScrollOffset = 0,
    getItemKey,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    loadingIndicator,
    threshold = 200,
    onScroll,
    onVisibleRangeChange,
    onItemsRendered,
    plugins = [],
    className,
    style,
    innerClassName,
    innerStyle,
    itemClassName,
    itemStyle,
    role = 'grid',
    ariaLabel,
    tabIndex,
    ...restProps
  } = props

  const containerRef = useRef<HTMLDivElement>(null)

  // Normalize gap
  const gapValue = typeof gap === 'number' ? gap : gap.x

  // Use virtual masonry hook
  const {
    virtualItems,
    totalSize,
    scrollTo,
    scrollToIndex,
    isScrolling,
    scrollOffset,
    range,
    columnCount,
    columnWidth,
    columnHeights,
    invalidateAllMeasurements,
    kernel,
  } = useVirtualMasonry({
    count: data.length,
    columns,
    minColumnWidth,
    getItemHeight: (index, colWidth) => {
      if (index >= data.length) return 100
      return getItemHeight(data[index] as T, colWidth)
    },
    gap,
    overscan,
    initialOffset: initialScrollOffset,
    getItemKey: getItemKey ? (index) => getItemKey(index, data) : undefined,
    containerRef,
  })

  // Heights derive from data; re-layout when it changes (getItemHeight is read via ref in the hook)
  useEffect(() => {
    invalidateAllMeasurements()
  }, [data, invalidateAllMeasurements])

  // Report range changes
  useEffect(() => {
    if (virtualItems.length === 0) return
    onVisibleRangeChange?.(range)
    onItemsRendered?.({
      overscanStartIndex: range.overscanStartIndex,
      overscanEndIndex: range.overscanEndIndex,
      visibleStartIndex: range.startIndex,
      visibleEndIndex: range.endIndex,
    })
  }, [range.startIndex, range.endIndex, range.overscanStartIndex, range.overscanEndIndex])

  // Imperative handle
  useImperativeHandle(ref, () => ({
    scrollTo: (offset, options) => scrollTo(offset, options),
    scrollToIndex: (index, options) => scrollToIndex(index, options),
    scrollToTop: (options) => scrollTo(0, options),
    scrollToBottom: (options) => scrollTo(totalSize, options),
    getScrollPosition: () => ({
      scrollTop: containerRef.current?.scrollTop ?? 0,
      scrollLeft: containerRef.current?.scrollLeft ?? 0,
    }),
  }), [scrollTo, scrollToIndex, totalSize])

  // Call onScroll callback
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    onScroll?.(target.scrollTop, target.scrollLeft)
  }, [onScroll])

  // Handle infinite scroll
  const handleScrollForInfinite = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isLoading) return

    const target = event.currentTarget
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight

    if (scrollBottom < threshold) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoading, threshold])

  // Container styles
  const containerStyles: CSSProperties = useMemo(() => ({
    height,
    width,
    overflow: 'auto',
    position: 'relative',
    contain: 'strict',
    ...style,
  }), [height, width, style])

  // Inner container styles
  const innerContainerStyles: CSSProperties = useMemo(() => ({
    height: totalSize,
    width: '100%',
    position: 'relative',
    contain: 'size layout',
    ...innerStyle,
  }), [totalSize, innerStyle])

  // Create render item props
  const createRenderProps = useCallback(
    (index: number, virtualItem: typeof virtualItems[0]): MasonryRenderItemProps<T> => {
      if (index >= data.length) {
        throw new Error(`[Scrollex] Item at index ${index} is out of range`)
      }
      const item = data[index] as T

      const columnIndex = virtualItem.lane
      const left = columnIndex * (columnWidth + gapValue)
      // Indexes don't follow the layout in a masonry, so visibility comes from the item's own geometry
      const viewportHeight = kernel.getViewport().height

      const itemStyles: CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: columnWidth,
        height: virtualItem.size,
        transform: `translate(${left}px, ${virtualItem.start}px)`,
        willChange: 'transform',
        contain: 'layout style',
        ...itemStyle,
      }

      return {
        item,
        index,
        style: itemStyles,
        measureRef: () => {}, // Masonry uses calculated heights
        isVisible: virtualItem.end > scrollOffset && virtualItem.start < scrollOffset + viewportHeight,
        isScrolling,
        columnIndex,
        rowIndex: 0, // Not meaningful for masonry
        columnWidth,
        width: columnWidth,
      }
    },
    [data, columnWidth, gapValue, itemStyle, isScrolling, scrollOffset, kernel]
  )

  // Install plugins from props on the live kernel
  useKernelPlugins(kernel, plugins)

  // A list that does not overflow can't fire a scroll event, so ask for more data after layout
  useLoadMoreWhenShort(containerRef, { count: data.length, totalSize, hasMore, isLoading, threshold, onLoadMore })

  // Context value
  const contextValue = useMemo(() => ({
    kernel,
  }), [kernel])

  return (
    <ScrollexContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={containerStyles}
        onScroll={(e) => {
          handleScroll(e)
          handleScrollForInfinite(e)
        }}
        role={role}
        aria-label={ariaLabel}
        aria-colcount={columnCount}
        tabIndex={tabIndex}
        {...restProps}
      >
        <div className={innerClassName} style={innerContainerStyles}>
          {virtualItems.map((virtualItem) => {
            const index = virtualItem.index
            if (index >= data.length) return null

            return (
              <div
                key={virtualItem.key}
                className={itemClassName}
                data-index={index}
                role="gridcell"
                aria-colindex={virtualItem.lane + 1}
              >
                {renderItem(createRenderProps(index, virtualItem))}
              </div>
            )
          })}
        </div>
        {isLoading && loadingIndicator}
      </div>
    </ScrollexContext.Provider>
  )
}

/**
 * VirtualMasonry component with forwardRef.
 */
export const VirtualMasonry = forwardRef(VirtualMasonryInner) as <T>(
  props: VirtualMasonryProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> }
) => React.ReactElement
