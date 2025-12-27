import { vi } from 'vitest'
import { bidirectional } from '../../../src/plugins/optional/bidirectional.js'
import type { Kernel, ScrollEvent } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: {
  itemCount?: number
  totalSize?: number
  scrollTop?: number
  viewportHeight?: number
} = {}): Kernel {
  const {
    itemCount = 100,
    totalSize = 5000,
    scrollTop = 0,
    viewportHeight = 400,
  } = options

  let currentScrollTop = scrollTop

  return {
    getItemCount: vi.fn(() => itemCount),
    getTotalSize: vi.fn(() => totalSize),
    getScrollPosition: vi.fn(() => ({ scrollTop: currentScrollTop, scrollLeft: 0 })),
    setScrollPosition: vi.fn((pos: { scrollTop: number; scrollLeft: number }) => {
      currentScrollTop = pos.scrollTop
    }),
    scrollTo: vi.fn((offset: number) => {
      currentScrollTop = offset
    }),
    getViewport: vi.fn(() => ({
      top: currentScrollTop,
      left: 0,
      width: 300,
      height: viewportHeight,
      bottom: currentScrollTop + viewportHeight,
      right: 300,
    })),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(() => 50),
    getEstimatedHeight: vi.fn(() => 50),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    isScrolling: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    emit: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
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

describe('bidirectional', () => {
  let kernel: Kernel

  beforeEach(() => {
    vi.useFakeTimers()
    kernel = createMockKernel()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('installation', () => {
    it('should install with default options', () => {
      const plugin = bidirectional()

      expect(plugin.name).toBe('bidirectional')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should scroll to bottom on install with bottom initial position', async () => {
      kernel = createMockKernel({ totalSize: 5000 })

      const plugin = bidirectional({ initialPosition: 'bottom' })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledWith(5000)
    })

    it('should not scroll on install with top initial position', async () => {
      const plugin = bidirectional({ initialPosition: 'top' })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).not.toHaveBeenCalled()
    })

    it('should uninstall properly', () => {
      const plugin = bidirectional()
      plugin.install?.(kernel)
      plugin.uninstall?.()

      expect(plugin.api?.isAtBottom()).toBe(false)
    })
  })

  describe('isAtBottom', () => {
    it('should return true when at bottom', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4600, // At bottom
      })

      const plugin = bidirectional({ stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtBottom()).toBe(true)
    })

    it('should return false when not at bottom', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 1000,
      })

      const plugin = bidirectional({ stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtBottom()).toBe(false)
    })

    it('should respect stick threshold', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4500, // 100px from bottom (within 100 threshold)
      })

      const plugin = bidirectional({ stickThreshold: 100 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtBottom()).toBe(true)
    })
  })

  describe('isAtTop', () => {
    it('should return true when at top', () => {
      kernel = createMockKernel({ scrollTop: 0 })

      const plugin = bidirectional({ stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtTop()).toBe(true)
    })

    it('should return false when not at top', () => {
      kernel = createMockKernel({ scrollTop: 500 })

      const plugin = bidirectional({ stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtTop()).toBe(false)
    })

    it('should respect stick threshold', () => {
      kernel = createMockKernel({ scrollTop: 40 })

      const plugin = bidirectional({ stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isAtTop()).toBe(true)
    })
  })

  describe('scrollToBottom', () => {
    it('should scroll to bottom', () => {
      kernel = createMockKernel({ totalSize: 5000, scrollTop: 0 })

      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.scrollToBottom()

      expect(kernel.scrollTo).toHaveBeenCalledWith(5000, { behavior: 'auto' })
    })

    it('should scroll smoothly when requested', () => {
      kernel = createMockKernel({ totalSize: 5000 })

      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.scrollToBottom(true)

      expect(kernel.scrollTo).toHaveBeenCalledWith(5000, { behavior: 'smooth' })
    })

    it('should not throw without kernel', () => {
      const plugin = bidirectional()

      expect(() => plugin.api?.scrollToBottom()).not.toThrow()
    })
  })

  describe('scrollToTop', () => {
    it('should scroll to top', () => {
      kernel = createMockKernel({ scrollTop: 1000 })

      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.scrollToTop()

      expect(kernel.scrollTo).toHaveBeenCalledWith(0, { behavior: 'auto' })
    })

    it('should scroll smoothly when requested', () => {
      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.scrollToTop(true)

      expect(kernel.scrollTo).toHaveBeenCalledWith(0, { behavior: 'smooth' })
    })
  })

  describe('stickToBottom', () => {
    it('should set and get sticking state', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4600,
      })

      const plugin = bidirectional({ stickToBottom: true })
      plugin.install?.(kernel)

      expect(plugin.api?.isStickingToBottom()).toBe(true)

      plugin.api?.setStickToBottom(false)

      expect(plugin.api?.isStickingToBottom()).toBe(false)
    })

    it('should update sticking based on scroll position', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4600,
      })

      const plugin = bidirectional({ stickToBottom: true, stickThreshold: 50 })
      plugin.install?.(kernel)

      expect(plugin.api?.isStickingToBottom()).toBe(true)

      // Scroll away from bottom
      ;(kernel.getScrollPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        scrollTop: 1000,
        scrollLeft: 0,
      })

      plugin.hooks?.onScroll?.(createScrollEvent(1000))

      expect(plugin.api?.isStickingToBottom()).toBe(false)
    })
  })

  describe('adjustForPrepend', () => {
    it('should adjust scroll position for prepended items', () => {
      kernel = createMockKernel({ scrollTop: 500 })

      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.adjustForPrepend(200)

      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 700, // 500 + 200
        scrollLeft: 0,
      })
    })

    it('should not adjust for zero or negative height', () => {
      const plugin = bidirectional()
      plugin.install?.(kernel)

      plugin.api?.adjustForPrepend(0)
      plugin.api?.adjustForPrepend(-100)

      expect(kernel.setScrollPosition).not.toHaveBeenCalled()
    })

    it('should not throw without kernel', () => {
      const plugin = bidirectional()

      expect(() => plugin.api?.adjustForPrepend(100)).not.toThrow()
    })
  })

  describe('onLoadMore', () => {
    it('should trigger backward load when near top', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 50,
      })

      const onLoadMore = vi.fn()
      const plugin = bidirectional({
        onLoadMore,
        loadMoreThreshold: 200,
      })
      plugin.install?.(kernel)

      plugin.hooks?.onScroll?.(createScrollEvent(50))

      expect(onLoadMore).toHaveBeenCalledWith('backward')
    })

    it('should trigger forward load when near bottom', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4450, // 150 from bottom
      })

      const onLoadMore = vi.fn()
      const plugin = bidirectional({
        onLoadMore,
        loadMoreThreshold: 200,
      })
      plugin.install?.(kernel)

      plugin.hooks?.onScroll?.(createScrollEvent(4450))

      expect(onLoadMore).toHaveBeenCalledWith('forward')
    })

    it('should not trigger when in middle', () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 2000,
      })

      const onLoadMore = vi.fn()
      const plugin = bidirectional({
        onLoadMore,
        loadMoreThreshold: 200,
      })
      plugin.install?.(kernel)

      plugin.hooks?.onScroll?.(createScrollEvent(2000))

      expect(onLoadMore).not.toHaveBeenCalled()
    })
  })

  describe('items change handling', () => {
    it('should scroll to bottom when sticking and items added', async () => {
      kernel = createMockKernel({
        totalSize: 5000,
        viewportHeight: 400,
        scrollTop: 4600,
      })

      const plugin = bidirectional({ stickToBottom: true, initialPosition: 'top' })
      plugin.install?.(kernel)

      // Mark as initialized
      await vi.advanceTimersByTimeAsync(16)

      // Update total size for new items
      ;(kernel.getTotalSize as ReturnType<typeof vi.fn>).mockReturnValue(5500)

      // Simulate items change
      plugin.hooks?.onItemsChange?.(110, 100)

      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalled()
    })
  })
})
