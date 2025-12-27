import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  CSSProperties,
} from 'react'
import type {
  VirtualGridProps,
  VirtualListHandle,
  GridRenderItemProps,
} from '../../types.js'
import { useVirtualGrid } from '../hooks/use-virtual-grid.js'
import { ScrollexContext } from '../context.js'
import { createKernel } from '../../kernel/kernel.js'

/**
 * A virtualized grid component that efficiently renders large datasets in a grid layout.
 * Only renders items that are visible in the viewport, plus an overscan buffer.
 *
 * @template T - The type of items in the data array
 *
 * @example
 * ```tsx
 * <VirtualGrid
 *   data={products}
 *   columns={4}
 *   itemHeight={200}
 *   gap={16}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>
 *       <ProductCard product={item} />
 *     </div>
 *   )}
 * />
 * ```
 *
 * @example Responsive columns
 * ```tsx
 * <VirtualGrid
 *   data={products}
 *   columns="auto"
 *   minColumnWidth={200}
 *   itemHeight={250}
 *   renderItem={({ item, style, columnWidth }) => (
 *     <div style={style}>
 *       <ProductCard product={item} width={columnWidth} />
 *     </div>
 *   )}
 * />
 * ```
 */
function VirtualGridInner<T>(
  props: VirtualGridProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    data,
    renderItem,
    itemHeight,
    columns,
    minColumnWidth = 100,
    gap = 0,
    height = '100%',
    width = '100%',
    overscan = 2,
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
  const gapX = typeof gap === 'number' ? gap : gap.x
  const gapY = typeof gap === 'number' ? gap : gap.y

  // Use virtual grid hook
  const {
    virtualItems,
    totalSize,
    scrollTo,
    scrollToIndex,
    isScrolling,
    range,
    columnCount,
    columnWidth,
    rowCount,
  } = useVirtualGrid({
    count: data.length,
    columns: typeof columns === 'number' ? columns : 1, // TODO: handle auto
    rowHeight: itemHeight,
    gap: { x: gapX, y: gapY },
    overscan,
    initialOffset: initialScrollOffset,
    getItemKey: getItemKey ? (index) => getItemKey(index, data) : undefined,
    containerRef,
  })

  // Create kernel for context
  const kernelRef = useRef(createKernel({
    itemCount: data.length,
    estimatedItemHeight: itemHeight,
    overscan,
    direction: 'vertical',
  }))

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
    (index: number, virtualItem: typeof virtualItems[0]): GridRenderItemProps<T> => {
      const item = data[index]
      if (item === undefined) {
        throw new Error(`[Scrollex] Item at index ${index} is undefined`)
      }

      const columnIndex = virtualItem.lane
      const rowIndex = Math.floor(index / columnCount)
      const left = columnIndex * (columnWidth + gapX)

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
        measureRef: () => {}, // Grid uses fixed heights
        isVisible: index >= range.startIndex && index <= range.endIndex,
        isScrolling,
        columnIndex,
        rowIndex,
        columnWidth,
      }
    },
    [data, columnCount, columnWidth, gapX, itemStyle, range, isScrolling]
  )

  // Context value
  const contextValue = useMemo(() => ({
    kernel: kernelRef.current,
  }), [])

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
        aria-rowcount={rowCount}
        aria-colcount={columnCount}
        tabIndex={tabIndex}
        {...restProps}
      >
        <div className={innerClassName} style={innerContainerStyles}>
          {virtualItems.map((virtualItem) => {
            const index = virtualItem.index
            const item = data[index]
            if (item === undefined) return null

            const rowIndex = Math.floor(index / columnCount)
            const columnIndex = virtualItem.lane

            return (
              <div
                key={virtualItem.key}
                className={itemClassName}
                data-index={index}
                role="gridcell"
                aria-rowindex={rowIndex + 1}
                aria-colindex={columnIndex + 1}
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
 * VirtualGrid component with forwardRef.
 */
export const VirtualGrid = forwardRef(VirtualGridInner) as <T>(
  props: VirtualGridProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> }
) => React.ReactElement
