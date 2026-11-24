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

interface LoaderState {
  loading: boolean
  loadGeneration: number
  hasMoreForward: boolean
  hasMoreBackward: boolean
}

function initialLoaderState(direction: LoadDirection | 'both'): LoaderState {
  return { loading: false, loadGeneration: 0, hasMoreForward: true, hasMoreBackward: direction === 'backward' || direction === 'both' }
}

/** Loader state per kernel, shared by the instances that are created for it one after another. */
const sharedLoaderStates = new WeakMap<Kernel, LoaderState>()

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
  // Shared by every instance created for the same kernel (see sharedLoaderStates)
  // loadGeneration is bumped per load and on reset; a superseded load must not clear a newer load's flag
  let state = initialLoaderState(direction)
  let lastCheckTime = 0
  const checkDebounceMs = 100
  // The newest scroll event that arrived inside the debounce window; it is checked when the window ends
  let pendingEvent: ScrollEvent | null = null
  let trailingTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Check if we should load more based on scroll position.
   */
  function checkLoadMore(event: ScrollEvent): void {
    if (state.loading || !kernel) return

    // Debounce checks: an event inside the window is not dropped, the last one is checked when the window ends
    // (a reader who stops inside the threshold zone produces no further event)
    const now = performance.now()
    if (now - lastCheckTime < checkDebounceMs) {
      pendingEvent = event
      if (trailingTimer === null) {
        trailingTimer = setTimeout(() => {
          trailingTimer = null
          const latest = pendingEvent
          pendingEvent = null
          if (latest) runCheck(latest)
        }, Math.max(0, checkDebounceMs - (now - lastCheckTime)))
      }
      return
    }

    runCheck(event)
  }

  function runCheck(event: ScrollEvent): void {
    if (state.loading || !kernel) return

    lastCheckTime = performance.now()

    const viewport = kernel.getViewport()
    const totalSize = kernel.getTotalSize()
    // The list's own axis: a horizontal list scrolls (and is measured) along x
    const horizontal = kernel.getOptions().direction === 'horizontal'
    const scrollTop = horizontal ? event.scrollLeft : event.scrollTop
    const viewportSize = horizontal ? viewport.width : viewport.height

    // Check forward (bottom)
    if (
      (direction === 'forward' || direction === 'both') &&
      state.hasMoreForward
    ) {
      const distanceFromBottom = totalSize - scrollTop - viewportSize
      if (distanceFromBottom < threshold) {
        triggerLoad('forward')
        return
      }
    }

    // Check backward (top)
    if (
      (direction === 'backward' || direction === 'both') &&
      state.hasMoreBackward
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
  function checkLoadMoreByRange(range: Range, forwardOnly = false): void {
    if (state.loading || !kernel) return

    const itemCount = kernel.getItemCount()

    // Check forward
    if (
      (direction === 'forward' || direction === 'both') &&
      state.hasMoreForward
    ) {
      const itemsFromEnd = itemCount - 1 - range.endIndex
      if (itemsFromEnd <= thresholdItems) {
        triggerLoad('forward')
        return
      }
    }

    // Check backward
    if (
      !forwardOnly &&
      (direction === 'backward' || direction === 'both') &&
      state.hasMoreBackward
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
    if (state.loading || !kernel) return

    // Check if we should load in this direction
    if (loadDirection === 'forward' && !state.hasMoreForward) return
    if (loadDirection === 'backward' && !state.hasMoreBackward) return

    state.loading = true
    const generation = ++state.loadGeneration

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
      if (generation === state.loadGeneration) {
        state.loading = false
      }
    }
  }

  const api: InfiniteLoaderAPI = {
    isLoading(): boolean {
      return state.loading
    },

    setLoading(l: boolean): void {
      state.loading = l
    },

    hasMore(): boolean {
      return state.hasMoreForward || state.hasMoreBackward
    },

    setHasMore(hasMore: boolean): void {
      state.hasMoreForward = hasMore
      state.hasMoreBackward = hasMore
    },

    hasMoreForward(): boolean {
      return state.hasMoreForward
    },

    setHasMoreForward(hasMore: boolean): void {
      state.hasMoreForward = hasMore
    },

    hasMoreBackward(): boolean {
      return state.hasMoreBackward
    },

    setHasMoreBackward(hasMore: boolean): void {
      state.hasMoreBackward = hasMore
    },

    reset(): void {
      state.loadGeneration++
      state.loading = false
      state.hasMoreForward = true
      state.hasMoreBackward = direction === 'backward' || direction === 'both'

      // A check queued by the debounce window belongs to the dataset that is being replaced: it would load
      // more for a position the reader no longer has
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer)
        trailingTimer = null
      }
      pendingEvent = null
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
      // Re-created for the same kernel (an inline `plugins={[infiniteLoaderPlugin(...)]}` is re-installed on
      // every parent render): carry on with the load in flight and the has-more flags
      const shared = sharedLoaderStates.get(k)
      if (shared) {
        state = shared
      } else {
        sharedLoaderStates.set(k, state)
        // The range the kernel announced before this plugin existed is not replayed, and a list that fits its
        // viewport gets no scroll event: look at where the list stands once, when the first instance is installed
        // (forward only: the start of a list that is about to be scrolled to its end is not a reason to load)
        checkLoadMoreByRange(k.getVisibleRange(), true)
      }
    },

    uninstall(): void {
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer)
        trailingTimer = null
      }
      pendingEvent = null

      // The state stays with the kernel: a load that is still running clears its own flag when it settles
      kernel = null
    },

    hooks: {
      onScroll: checkLoadMore,
      onVisibleRangeChange: (range) => checkLoadMoreByRange(range),
    },

    api,
  }
}
