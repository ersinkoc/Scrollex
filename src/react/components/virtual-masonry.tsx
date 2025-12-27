import React, {
  forwardRef,
  useRef,
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
import { ScrollexContext } from '../context.js'
import { createKernel } from '../../kernel/kernel.js'

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
    range,
    columnCount,
    columnWidth,
    columnHeights,
  } = useVirtualMasonry({
    count: data.length,
    columns: typeof columns === 'number' ? columns : 3, // TODO: handle auto
    getItemHeight: (index, colWidth) => {
      const item = data[index]
      if (item === undefined) return 100
      return getItemHeight(item, colWidth)
    },
    gap: gapValue,
    overscan,
    containerRef,
  })

  // Create kernel for context
  const kernelRef = useRef(createKernel({
    itemCount: data.length,
    estimatedItemHeight: 200,
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
    (index: number, virtualItem: typeof virtualItems[0]): MasonryRenderItemProps<T> => {
      const item = data[index]
      if (item === undefined) {
        throw new Error(`[Scrollex] Item at index ${index} is undefined`)
      }

      const columnIndex = virtualItem.lane
      const left = columnIndex * (columnWidth + gapValue)

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
        isVisible: true, // All virtual items are considered visible
        isScrolling,
        columnIndex,
        rowIndex: 0, // Not meaningful for masonry
        columnWidth,
        width: columnWidth,
      }
    },
    [data, columnWidth, gapValue, itemStyle, isScrolling]
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
        aria-colcount={columnCount}
        tabIndex={tabIndex}
        {...restProps}
      >
        <div className={innerClassName} style={innerContainerStyles}>
          {virtualItems.map((virtualItem) => {
            const index = virtualItem.index
            const item = data[index]
            if (item === undefined) return null

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
