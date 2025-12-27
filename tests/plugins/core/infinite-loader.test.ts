import { vi } from 'vitest'
import { infiniteLoaderPlugin, type LoadDirection } from '../../../src/plugins/core/infinite-loader.js'
import type { Kernel, ScrollEvent, Range } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: {
  itemCount?: number
  viewportHeight?: number
  totalSize?: number
} = {}): Kernel {
  const {
    itemCount = 100,
    viewportHeight = 400,
    totalSize = 5000,
  } = options

  return {
    getItemCount: vi.fn(() => itemCount),
    getViewport: vi.fn(() => ({
      top: 0,
      left: 0,
      width: 300,
      height: viewportHeight,
      bottom: viewportHeight,
      right: 300,
    })),
    getTotalSize: vi.fn(() => totalSize),
    emit: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
    getEstimatedHeight: vi.fn(() => 50),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    isScrolling: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
    setScrollPosition: vi.fn(),
    getItemOffset: vi.fn((index: number) => index * 50),
    getOptions: vi.fn(() => ({ overscan: 2 })),
  } as unknown as Kernel
}

function createScrollEvent(scrollTop: number): ScrollEvent {
  return {
    type: 'scroll',
    scrollTop,
    scrollLeft: 0,
    deltaY: 0,
    deltaX: 0,
    direction: scrollTop > 0 ? 'down' : 'up',
    timestamp: Date.now(),
  }
}

function createRange(startIndex: number, endIndex: number): Range {
  return {
    startIndex,
    endIndex,
    overscanStartIndex: Math.max(0, startIndex - 2),
    overscanEndIndex: endIndex + 2,
  }
}

describe('infiniteLoaderPlugin', () => {
  let kernel: Kernel
  let onLoadMore: (direction: LoadDirection) => void

  beforeEach(() => {
    vi.useFakeTimers()
    kernel = createMockKernel()
    onLoadMore = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('installation', () => {
    it('should install with default options', () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })

      expect(plugin.name).toBe('infinite-loader')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('core')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should uninstall and clear state', () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.uninstall?.()

      expect(plugin.api?.isLoading()).toBe(false)
    })
  })

  describe('loading state', () => {
    it('should track loading state', () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      expect(plugin.api?.isLoading()).toBe(false)

      plugin.api?.setLoading(true)

      expect(plugin.api?.isLoading()).toBe(true)
    })
  })

  describe('hasMore state', () => {
    it('should check if has more items', () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      expect(plugin.api?.hasMore()).toBe(true)
      expect(plugin.api?.hasMoreForward()).toBe(true)
      expect(plugin.api?.hasMoreBackward()).toBe(false)
    })

    it('should handle backward direction', () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'backward',
      })
      plugin.install?.(kernel)

      expect(plugin.api?.hasMoreForward()).toBe(true)
      expect(plugin.api?.hasMoreBackward()).toBe(true)
    })

    it('should handle both directions', () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      expect(plugin.api?.hasMoreForward()).toBe(true)
      expect(plugin.api?.hasMoreBackward()).toBe(true)
    })

    it('should set hasMore for both directions', () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.api?.setHasMore(false)

      expect(plugin.api?.hasMoreForward()).toBe(false)
      expect(plugin.api?.hasMoreBackward()).toBe(false)
      expect(plugin.api?.hasMore()).toBe(false)
    })

    it('should set hasMoreForward separately', () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      plugin.api?.setHasMoreForward(false)

      expect(plugin.api?.hasMoreForward()).toBe(false)
      expect(plugin.api?.hasMoreBackward()).toBe(true)
    })

    it('should set hasMoreBackward separately', () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      plugin.api?.setHasMoreBackward(false)

      expect(plugin.api?.hasMoreForward()).toBe(true)
      expect(plugin.api?.hasMoreBackward()).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      plugin.api?.setLoading(true)
      plugin.api?.setHasMoreForward(false)
      plugin.api?.setHasMoreBackward(false)

      plugin.api?.reset()

      expect(plugin.api?.isLoading()).toBe(false)
      expect(plugin.api?.hasMoreForward()).toBe(true)
      expect(plugin.api?.hasMoreBackward()).toBe(true)
    })
  })

  describe('scroll-based loading', () => {
    it('should trigger load when near bottom', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        threshold: 200,
        direction: 'forward',
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      // Advance time past the debounce period (100ms)
      await vi.advanceTimersByTimeAsync(150)

      // Scroll near bottom (5000 - 4500 - 400 = 100 < 200 threshold)
      const event = createScrollEvent(4500)
      plugin.hooks?.onScroll?.(event)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('forward')
    })

    it('should not trigger load when far from bottom', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        threshold: 200,
        direction: 'forward',
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      // Scroll far from bottom
      const event = createScrollEvent(1000)
      plugin.hooks?.onScroll?.(event)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should trigger backward load when near top', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        threshold: 200,
        direction: 'both',
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      // Advance time past the debounce period (100ms)
      await vi.advanceTimersByTimeAsync(150)

      // Scroll near top (100 < 200 threshold)
      const event = createScrollEvent(100)
      plugin.hooks?.onScroll?.(event)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('backward')
    })

    it('should not trigger when loading', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        threshold: 200,
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      plugin.api?.setLoading(true)

      const event = createScrollEvent(4500)
      plugin.hooks?.onScroll?.(event)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should not trigger when no more items', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        threshold: 200,
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      plugin.api?.setHasMoreForward(false)

      const event = createScrollEvent(4500)
      plugin.hooks?.onScroll?.(event)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should debounce scroll checks', async () => {
      const mockLoadMore = vi.fn().mockResolvedValue(undefined)
      const plugin = infiniteLoaderPlugin({
        onLoadMore: mockLoadMore,
        threshold: 200,
      })

      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400 })
      plugin.install?.(kernel)

      // Advance time past the initial debounce period (100ms)
      await vi.advanceTimersByTimeAsync(150)

      // First scroll triggers load
      plugin.hooks?.onScroll?.(createScrollEvent(4500))
      await vi.advanceTimersByTimeAsync(0)

      // First call should trigger
      expect(mockLoadMore).toHaveBeenCalledTimes(1)

      // Rapid subsequent scrolls while loading - should not trigger again
      plugin.hooks?.onScroll?.(createScrollEvent(4500))
      plugin.hooks?.onScroll?.(createScrollEvent(4500))

      // Still only 1 call due to loading state
      expect(mockLoadMore).toHaveBeenCalledTimes(1)
    })
  })

  describe('range-based loading', () => {
    it('should trigger forward load when near end of items', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        thresholdItems: 5,
        direction: 'forward',
      })

      kernel = createMockKernel({ itemCount: 100 })
      plugin.install?.(kernel)

      // Range ending at item 97 (3 items from end, less than threshold 5)
      const range = createRange(90, 97)
      plugin.hooks?.onVisibleRangeChange?.(range, null)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('forward')
    })

    it('should trigger backward load when near start of items', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        thresholdItems: 5,
        direction: 'both',
      })

      kernel = createMockKernel({ itemCount: 100 })
      plugin.install?.(kernel)

      // Range starting at item 3 (less than threshold 5)
      const range = createRange(3, 15)
      plugin.hooks?.onVisibleRangeChange?.(range, null)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('backward')
    })

    it('should not trigger when items are in middle', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        thresholdItems: 5,
        direction: 'both',
      })

      kernel = createMockKernel({ itemCount: 100 })
      plugin.install?.(kernel)

      // Range in middle
      const range = createRange(40, 60)
      plugin.hooks?.onVisibleRangeChange?.(range, null)

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })
  })

  describe('triggerLoad', () => {
    it('should manually trigger forward load', async () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.api?.triggerLoad('forward')

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('forward')
    })

    it('should manually trigger backward load', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      plugin.api?.triggerLoad('backward')

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).toHaveBeenCalledWith('backward')
    })

    it('should emit load-more event', async () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.api?.triggerLoad('forward')

      await vi.advanceTimersByTimeAsync(0)

      expect(kernel.emit).toHaveBeenCalledWith({
        type: 'load-more',
        direction: 'forward',
      })
    })

    it('should not trigger if already loading', async () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.api?.setLoading(true)
      plugin.api?.triggerLoad('forward')

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should not trigger forward if no more forward', async () => {
      const plugin = infiniteLoaderPlugin({ onLoadMore })
      plugin.install?.(kernel)

      plugin.api?.setHasMoreForward(false)
      plugin.api?.triggerLoad('forward')

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should not trigger backward if no more backward', async () => {
      const plugin = infiniteLoaderPlugin({
        onLoadMore,
        direction: 'both',
      })
      plugin.install?.(kernel)

      plugin.api?.setHasMoreBackward(false)
      plugin.api?.triggerLoad('backward')

      await vi.advanceTimersByTimeAsync(0)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('should handle async onLoadMore errors', async () => {
      const error = new Error('Load failed')
      const failingOnLoadMore = vi.fn().mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const plugin = infiniteLoaderPlugin({ onLoadMore: failingOnLoadMore })
      plugin.install?.(kernel)

      plugin.api?.triggerLoad('forward')

      await vi.advanceTimersByTimeAsync(0)

      expect(consoleSpy).toHaveBeenCalledWith('[Scrollex] Error in onLoadMore:', error)
      expect(plugin.api?.isLoading()).toBe(false)

      consoleSpy.mockRestore()
    })
  })
})
