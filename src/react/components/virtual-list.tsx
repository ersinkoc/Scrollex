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
  VirtualListProps,
  VirtualListHandle,
  RenderItemProps,
  Plugin,
} from '../../types.js'
import { useVirtualList } from '../hooks/use-virtual-list.js'
import { useKernelPlugins } from '../hooks/use-kernel-plugins.js'
import { useLoadMoreWhenShort } from '../hooks/use-load-more-when-short.js'
import { ScrollexContext } from '../context.js'

/**
 * A virtualized list component that efficiently renders large datasets.
 * Only renders items that are visible in the viewport, plus an overscan buffer.
 *
 * @template T - The type of items in the data array
 *
 * @example
 * ```tsx
 * <VirtualList
 *   data={items}
 *   itemHeight={50}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>{item.name}</div>
 *   )}
 * />
 * ```
 *
 * @example Variable heights
 * ```tsx
 * <VirtualList
 *   data={items}
 *   itemHeight="auto"
 *   estimatedItemHeight={60}
 *   renderItem={({ item, style, measureRef }) => (
 *     <div ref={measureRef} style={style}>
 *       {item.content}
 *     </div>
 *   )}
 * />
 * ```
 */
function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    data,
    renderItem,
    itemHeight,
    estimatedItemHeight = 50,
    height = '100%',
    width = '100%',
    direction = 'vertical',
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
    role = 'listbox',
    ariaLabel,
    tabIndex,
    ...restProps
  } = props

  const containerRef = useRef<HTMLDivElement>(null)

  // Use virtual list hook
  const {
    virtualItems,
    totalSize,
    scrollTo,
    scrollToIndex,
    measureElement,
    isScrolling,
    range,
    kernel,
  } = useVirtualList({
    count: data.length,
    getItemHeight: itemHeight === 'auto' ? undefined : () => itemHeight as number,
    estimatedItemHeight: itemHeight === 'auto' ? estimatedItemHeight : (itemHeight as number),
    overscan,
    initialOffset: initialScrollOffset,
    getItemKey: getItemKey ? (index) => getItemKey(index, data) : undefined,
    horizontal: direction === 'horizontal',
    containerRef,
  })

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
    const distanceToEnd = direction === 'horizontal'
      ? target.scrollWidth - target.scrollLeft - target.clientWidth
      : target.scrollHeight - target.scrollTop - target.clientHeight

    if (distanceToEnd < threshold) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoading, threshold, direction])

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
    height: direction === 'vertical' ? totalSize : '100%',
    width: direction === 'horizontal' ? totalSize : '100%',
    position: 'relative',
    contain: 'size layout',
    ...innerStyle,
  }), [totalSize, direction, innerStyle])

  // Create render item props
  const createRenderProps = useCallback(
    (index: number): RenderItemProps<T> => {
      if (index >= data.length) {
        throw new Error(`[Scrollex] Item at index ${index} is out of range`)
      }
      const item = data[index] as T

      const virtualItem = virtualItems.find((vi) => vi.index === index)
      const itemOffset = virtualItem?.start ?? 0
      const itemSize = virtualItem?.size ?? estimatedItemHeight

      const itemStyles: CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        // Rows that are measured take the size of their content: a fixed size on the measured element would only
        // measure itself (the estimate until it is measured) and never grow
        width: direction === 'vertical' ? '100%' : itemHeight === 'auto' ? 'auto' : itemSize,
        height: direction === 'vertical' ? (itemHeight === 'auto' ? 'auto' : itemSize) : '100%',
        transform: direction === 'vertical'
          ? `translateY(${itemOffset}px)`
          : `translateX(${itemOffset}px)`,
        willChange: 'transform',
        contain: 'layout style',
        ...itemStyle,
      }

      return {
        item,
        index,
        style: itemStyles,
        measureRef: (el) => measureElement(index, el),
        isVisible: index >= range.startIndex && index <= range.endIndex,
        isScrolling,
      }
    },
    [data, virtualItems, estimatedItemHeight, itemHeight, direction, itemStyle, measureElement, range, isScrolling]
  )

  // Install plugins from props on the live kernel
  useKernelPlugins(kernel, plugins)

  // A list that does not overflow can't fire a scroll event, so ask for more data after layout
  useLoadMoreWhenShort(containerRef, { count: data.length, totalSize, hasMore, isLoading, threshold, horizontal: direction === 'horizontal', onLoadMore })

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
        aria-orientation={direction}
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
                role="option"
                aria-setsize={data.length}
                aria-posinset={index + 1}
              >
                {renderItem(createRenderProps(index))}
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
 * VirtualList component with forwardRef.
 */
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> }
) => React.ReactElement
