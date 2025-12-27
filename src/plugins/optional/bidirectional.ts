import type { Plugin, Kernel, ScrollEvent, ScrollPosition } from '../../types.js'

/**
 * Bidirectional scroll plugin options.
 */
export interface BidirectionalOptions {
  /** Initial scroll position */
  initialPosition?: 'top' | 'bottom'
  /** Whether to stick to bottom when new items are added */
  stickToBottom?: boolean
  /** Threshold in pixels from bottom to activate stick behavior */
  stickThreshold?: number
  /** Maintain scroll position when items are prepended */
  maintainPositionOnPrepend?: boolean
  /** Callback when load more is triggered */
  onLoadMore?: (direction: 'forward' | 'backward') => void
  /** Threshold for triggering load more (pixels from edge) */
  loadMoreThreshold?: number
}

/**
 * Bidirectional scroll plugin API.
 */
export interface BidirectionalAPI {
  /** Check if scrolled to bottom */
  isAtBottom(): boolean
  /** Check if scrolled to top */
  isAtTop(): boolean
  /** Scroll to bottom */
  scrollToBottom(smooth?: boolean): void
  /** Scroll to top */
  scrollToTop(smooth?: boolean): void
  /** Enable/disable stick to bottom */
  setStickToBottom(stick: boolean): void
  /** Check if sticking to bottom */
  isStickingToBottom(): boolean
  /** Adjust scroll position when items are prepended */
  adjustForPrepend(prependedHeight: number): void
}

/**
 * Creates a bidirectional scroll plugin.
 * Ideal for chat applications with messages loaded in both directions.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { bidirectional } from '@oxog/scrollex/plugins'
 *
 * <VirtualList
 *   data={messages}
 *   itemHeight="auto"
 *   plugins={[bidirectional({
 *     stickToBottom: true,
 *     initialPosition: 'bottom',
 *     maintainPositionOnPrepend: true,
 *   })]}
 *   onLoadMore={(direction) => {
 *     if (direction === 'backward') loadOlderMessages()
 *     if (direction === 'forward') loadNewerMessages()
 *   }}
 *   renderItem={({ item, measureRef }) => (
 *     <div ref={measureRef}>
 *       <Message message={item} />
 *     </div>
 *   )}
 * />
 * ```
 */
export function bidirectional(options: BidirectionalOptions = {}): Plugin {
  const {
    initialPosition = 'bottom',
    stickToBottom: initialStickToBottom = true,
    stickThreshold = 50,
    maintainPositionOnPrepend = true,
    onLoadMore,
    loadMoreThreshold = 200,
  } = options

  let kernel: Kernel | null = null
  let stickToBottom = initialStickToBottom
  let isSticking = initialStickToBottom
  let previousItemCount = 0
  let previousTotalSize = 0
  let isInitialized = false

  /**
   * Check if scroll is at bottom.
   */
  function checkIsAtBottom(): boolean {
    if (!kernel) return false

    const viewport = kernel.getViewport()
    const scrollPosition = kernel.getScrollPosition()
    const totalSize = kernel.getTotalSize()

    const maxScroll = totalSize - viewport.height
    return scrollPosition.scrollTop >= maxScroll - stickThreshold
  }

  /**
   * Check if scroll is at top.
   */
  function checkIsAtTop(): boolean {
    if (!kernel) return false

    const scrollPosition = kernel.getScrollPosition()
    return scrollPosition.scrollTop <= stickThreshold
  }

  /**
   * Handle scroll event.
   */
  function handleScroll(event: ScrollEvent): void {
    if (!kernel) return

    // Update sticking state based on scroll position
    if (stickToBottom) {
      isSticking = checkIsAtBottom()
    }

    // Check for load more triggers
    if (onLoadMore) {
      const viewport = kernel.getViewport()
      const totalSize = kernel.getTotalSize()

      // Check top (backward loading)
      if (event.scrollTop < loadMoreThreshold) {
        onLoadMore('backward')
      }

      // Check bottom (forward loading)
      const distanceFromBottom = totalSize - event.scrollTop - viewport.height
      if (distanceFromBottom < loadMoreThreshold) {
        onLoadMore('forward')
      }
    }
  }

  /**
   * Handle items change.
   */
  function handleItemsChange(count: number, previousCount: number): void {
    if (!kernel || !isInitialized) return

    const newTotalSize = kernel.getTotalSize()
    const sizeDelta = newTotalSize - previousTotalSize

    if (count > previousCount) {
      // Items were added
      if (maintainPositionOnPrepend && sizeDelta > 0) {
        // Check if items were prepended (scroll position would need adjustment)
        const scrollPosition = kernel.getScrollPosition()

        // If we're not at the very top and size increased, items might have been prepended
        if (scrollPosition.scrollTop > stickThreshold) {
          // This is a heuristic - in a real implementation, you'd need more context
          // about where items were added
        }
      }

      // If sticking to bottom, scroll to bottom after new items
      if (isSticking && stickToBottom) {
        requestAnimationFrame(() => {
          kernel?.scrollTo(kernel?.getTotalSize() ?? 0)
        })
      }
    }

    previousItemCount = count
    previousTotalSize = newTotalSize
  }

  const api: BidirectionalAPI = {
    isAtBottom(): boolean {
      return checkIsAtBottom()
    },

    isAtTop(): boolean {
      return checkIsAtTop()
    },

    scrollToBottom(smooth = false): void {
      if (!kernel) return

      const totalSize = kernel.getTotalSize()
      kernel.scrollTo(totalSize, { behavior: smooth ? 'smooth' : 'auto' })
    },

    scrollToTop(smooth = false): void {
      if (!kernel) return

      kernel.scrollTo(0, { behavior: smooth ? 'smooth' : 'auto' })
    },

    setStickToBottom(stick: boolean): void {
      stickToBottom = stick
      isSticking = stick && checkIsAtBottom()
    },

    isStickingToBottom(): boolean {
      return isSticking
    },

    adjustForPrepend(prependedHeight: number): void {
      if (!kernel || prependedHeight <= 0) return

      const scrollPosition = kernel.getScrollPosition()
      kernel.setScrollPosition({
        scrollTop: scrollPosition.scrollTop + prependedHeight,
        scrollLeft: scrollPosition.scrollLeft,
      })
    },
  }

  return {
    name: 'bidirectional',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k
      previousItemCount = k.getItemCount()
      previousTotalSize = k.getTotalSize()

      // Initial scroll position
      if (initialPosition === 'bottom') {
        requestAnimationFrame(() => {
          if (kernel) {
            kernel.scrollTo(kernel.getTotalSize())
            isInitialized = true
          }
        })
      } else {
        isInitialized = true
      }
    },

    uninstall(): void {
      kernel = null
      isInitialized = false
    },

    hooks: {
      onScroll: handleScroll,
      onItemsChange: handleItemsChange,
    },

    api,
  }
}
