import type { Plugin, Kernel, ScrollEvent, Range } from '../../types.js'

/**
 * Load direction.
 */
export type LoadDirection = 'forward' | 'backward'

/**
 * Infinite loader plugin options.
 */
export interface InfiniteLoaderOptions {
  /** Pixels from edge to trigger load */
  threshold?: number
  /** Items from edge to trigger load */
  thresholdItems?: number
  /** Direction to load more */
  direction?: LoadDirection | 'both'
  /** Callback when more items should be loaded */
  onLoadMore: (direction: LoadDirection) => void | Promise<void>
}

/**
 * Infinite loader plugin API.
 */
export interface InfiniteLoaderAPI {
  /** Check if currently loading */
  isLoading(): boolean
  /** Set loading state */
  setLoading(loading: boolean): void
  /** Check if there are more items to load */
  hasMore(): boolean
  /** Set whether there are more items */
  setHasMore(hasMore: boolean): void
  /** Check if can load forward */
  hasMoreForward(): boolean
  /** Set whether can load forward */
  setHasMoreForward(hasMore: boolean): void
  /** Check if can load backward */
  hasMoreBackward(): boolean
  /** Set whether can load backward */
  setHasMoreBackward(hasMore: boolean): void
  /** Reset loading state */
  reset(): void
  /** Trigger load manually */
  triggerLoad(direction: LoadDirection): void
}

/**
 * Creates an infinite loader plugin.
 * Handles infinite scroll detection and triggering.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function infiniteLoaderPlugin(options: InfiniteLoaderOptions): Plugin {
  const {
    threshold = 200,
    thresholdItems = 5,
    direction = 'forward',
    onLoadMore,
  } = options

  let kernel: Kernel | null = null
  let loading = false
  let hasMoreForward = true
  let hasMoreBackward = direction === 'backward' || direction === 'both'
  let lastCheckTime = 0
  const checkDebounceMs = 100

  /**
   * Check if we should load more based on scroll position.
   */
  function checkLoadMore(event: ScrollEvent): void {
    if (loading || !kernel) return

    // Debounce checks
    const now = performance.now()
    if (now - lastCheckTime < checkDebounceMs) return
    lastCheckTime = now

    const viewport = kernel.getViewport()
    const totalSize = kernel.getTotalSize()
    const { scrollTop } = event

    // Check forward (bottom)
    if (
      (direction === 'forward' || direction === 'both') &&
      hasMoreForward
    ) {
      const distanceFromBottom = totalSize - scrollTop - viewport.height
      if (distanceFromBottom < threshold) {
        triggerLoad('forward')
        return
      }
    }

    // Check backward (top)
    if (
      (direction === 'backward' || direction === 'both') &&
      hasMoreBackward
    ) {
      if (scrollTop < threshold) {
        triggerLoad('backward')
        return
      }
    }
  }

  /**
   * Check if we should load more based on visible range.
   */
  function checkLoadMoreByRange(range: Range): void {
    if (loading || !kernel) return

    const itemCount = kernel.getItemCount()

    // Check forward
    if (
      (direction === 'forward' || direction === 'both') &&
      hasMoreForward
    ) {
      const itemsFromEnd = itemCount - 1 - range.endIndex
      if (itemsFromEnd <= thresholdItems) {
        triggerLoad('forward')
        return
      }
    }

    // Check backward
    if (
      (direction === 'backward' || direction === 'both') &&
      hasMoreBackward
    ) {
      if (range.startIndex <= thresholdItems) {
        triggerLoad('backward')
        return
      }
    }
  }

  /**
   * Trigger loading in a direction.
   */
  async function triggerLoad(loadDirection: LoadDirection): Promise<void> {
    if (loading || !kernel) return

    // Check if we should load in this direction
    if (loadDirection === 'forward' && !hasMoreForward) return
    if (loadDirection === 'backward' && !hasMoreBackward) return

    loading = true

    // Emit load-more event
    kernel.emit({
      type: 'load-more',
      direction: loadDirection,
    })

    try {
      await onLoadMore(loadDirection)
    } catch (error) {
      console.error('[Scrollex] Error in onLoadMore:', error)
    } finally {
      loading = false
    }
  }

  const api: InfiniteLoaderAPI = {
    isLoading(): boolean {
      return loading
    },

    setLoading(l: boolean): void {
      loading = l
    },

    hasMore(): boolean {
      return hasMoreForward || hasMoreBackward
    },

    setHasMore(hasMore: boolean): void {
      hasMoreForward = hasMore
      hasMoreBackward = hasMore
    },

    hasMoreForward(): boolean {
      return hasMoreForward
    },

    setHasMoreForward(hasMore: boolean): void {
      hasMoreForward = hasMore
    },

    hasMoreBackward(): boolean {
      return hasMoreBackward
    },

    setHasMoreBackward(hasMore: boolean): void {
      hasMoreBackward = hasMore
    },

    reset(): void {
      loading = false
      hasMoreForward = true
      hasMoreBackward = direction === 'backward' || direction === 'both'
    },

    triggerLoad(loadDirection: LoadDirection): void {
      triggerLoad(loadDirection)
    },
  }

  return {
    name: 'infinite-loader',
    version: '1.0.0',
    type: 'core',

    install(k: Kernel): void {
      kernel = k
    },

    uninstall(): void {
      kernel = null
      loading = false
    },

    hooks: {
      onScroll: checkLoadMore,
      onVisibleRangeChange: (range) => checkLoadMoreByRange(range),
    },

    api,
  }
}
