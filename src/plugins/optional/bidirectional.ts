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
  /** Declared, not implemented yet: call `adjustForPrepend` after prepending */
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
 * Kernels whose initial position was already applied. A plugin passed inline is a new instance on every
 * parent render and is re-installed on the same kernel; the initial position belongs to the first mount.
 */
const positionedKernels = new WeakSet<Kernel>()

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
 *     onLoadMore: (direction) => {
 *       if (direction === 'backward') loadOlderMessages()
 *       if (direction === 'forward') loadNewerMessages()
 *     },
 *   })]}
 *   renderItem={({ item, style, measureRef }) => (
 *     <div ref={measureRef} style={style}>
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
  let initialFrame: number | null = null
  // Load-more is edge-triggered: once per visit to a zone, re-armed when leaving it or when items change
  let backwardTriggered = false
  let forwardTriggered = false

  /**
   * The list's own axis: a horizontal list scrolls (and is measured) along x.
   */
  function isHorizontal(): boolean {
    return kernel?.getOptions().direction === 'horizontal'
  }

  function getOffset(position: { scrollTop: number; scrollLeft: number }): number {
    return isHorizontal() ? position.scrollLeft : position.scrollTop
  }

  /**
   * Check if scroll is at bottom.
   */
  function checkIsAtBottom(): boolean {
    if (!kernel) return false

    const viewport = kernel.getViewport()
    const totalSize = kernel.getTotalSize()

    const maxScroll = totalSize - (isHorizontal() ? viewport.width : viewport.height)
    return getOffset(kernel.getScrollPosition()) >= maxScroll - stickThreshold
  }

  /**
   * Check if scroll is at top.
   */
  function checkIsAtTop(): boolean {
    if (!kernel) return false

    return getOffset(kernel.getScrollPosition()) <= stickThreshold
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
      const offset = getOffset(event)
      const viewportSize = isHorizontal() ? viewport.width : viewport.height

      // Check top (backward loading)
      if (offset < loadMoreThreshold) {
        if (!backwardTriggered) {
          backwardTriggered = true
          onLoadMore('backward')
        }
      } else {
        backwardTriggered = false
      }

      // Check bottom (forward loading)
      const distanceFromBottom = totalSize - offset - viewportSize
      if (distanceFromBottom < loadMoreThreshold) {
        if (!forwardTriggered) {
          forwardTriggered = true
          onLoadMore('forward')
        }
      } else {
        forwardTriggered = false
      }
    }
  }

  /**
   * Handle items change.
   */
  function handleItemsChange(count: number, previousCount: number): void {
    // New items arrived: a zone the scroll is still in may ask for more again
    backwardTriggered = false
    forwardTriggered = false

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
      const horizontal = isHorizontal()
      kernel.setScrollPosition({
        scrollTop: scrollPosition.scrollTop + (horizontal ? 0 : prependedHeight),
        scrollLeft: scrollPosition.scrollLeft + (horizontal ? prependedHeight : 0),
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

      // Sticking follows where the reader is: a list that is about to be scrolled to the bottom sticks, anything
      // else only when it is at the bottom already (not a list that starts at the top, or a re-installed plugin
      // whose reader scrolled away)
      isSticking = stickToBottom && ((initialPosition === 'bottom' && !positionedKernels.has(k)) || checkIsAtBottom())

      // Initial scroll position (once per kernel, not on every re-install)
      if (initialPosition === 'bottom' && !positionedKernels.has(k)) {
        initialFrame = requestAnimationFrame(() => {
          initialFrame = null
          if (kernel) {
            if (!positionedKernels.has(kernel)) {
              positionedKernels.add(kernel)
              kernel.scrollTo(kernel.getTotalSize())
            }
            isInitialized = true
          }
        })
      } else {
        isInitialized = true
      }
    },

    uninstall(): void {
      if (initialFrame !== null) {
        cancelAnimationFrame(initialFrame)
        initialFrame = null
      }
      kernel = null
      isInitialized = false
      backwardTriggered = false
      forwardTriggered = false
    },

    hooks: {
      onScroll: handleScroll,
      onItemsChange: handleItemsChange,
    },

    api,
  }
}
