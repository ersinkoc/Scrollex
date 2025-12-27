import { vi } from 'vitest'
import {
  scrollControllerPlugin,
  easings,
} from '../../../src/plugins/core/scroll-controller.js'
import type { Kernel } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: { scrollTop?: number; viewportHeight?: number; totalSize?: number } = {}): Kernel {
  const { scrollTop = 0, viewportHeight = 400, totalSize = 2000 } = options

  let currentScrollTop = scrollTop

  return {
    getScrollPosition: vi.fn(() => ({ scrollTop: currentScrollTop, scrollLeft: 0 })),
    setScrollPosition: vi.fn((pos: { scrollTop: number }) => {
      currentScrollTop = pos.scrollTop
    }),
    getItemOffset: vi.fn((index: number) => index * 100),
    getCachedHeight: vi.fn(() => 100),
    getEstimatedHeight: vi.fn(() => 50),
    getViewport: vi.fn(() => ({
      top: currentScrollTop,
      left: 0,
      width: 300,
      height: viewportHeight,
      bottom: currentScrollTop + viewportHeight,
      right: 300,
    })),
    getTotalSize: vi.fn(() => totalSize),
    isScrolling: vi.fn(() => false),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    emit: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
    getItemCount: vi.fn(() => 20),
  } as unknown as Kernel
}

describe('easings', () => {
  it('should have linear easing', () => {
    expect(easings.linear(0)).toBe(0)
    expect(easings.linear(0.5)).toBe(0.5)
    expect(easings.linear(1)).toBe(1)
  })

  it('should have easeIn easing', () => {
    expect(easings.easeIn(0)).toBe(0)
    expect(easings.easeIn(0.5)).toBe(0.25)
    expect(easings.easeIn(1)).toBe(1)
  })

  it('should have easeOut easing', () => {
    expect(easings.easeOut(0)).toBe(0)
    expect(easings.easeOut(0.5)).toBe(0.75)
    expect(easings.easeOut(1)).toBe(1)
  })

  it('should have easeInOut easing', () => {
    expect(easings.easeInOut(0)).toBe(0)
    expect(easings.easeInOut(0.5)).toBe(0.5)
    expect(easings.easeInOut(1)).toBe(1)
    expect(easings.easeInOut(0.25)).toBeCloseTo(0.125)
    expect(easings.easeInOut(0.75)).toBeCloseTo(0.875)
  })

  it('should have cubic easings', () => {
    expect(easings.easeInCubic(0)).toBe(0)
    expect(easings.easeInCubic(1)).toBe(1)
    expect(easings.easeOutCubic(0)).toBe(0)
    expect(easings.easeOutCubic(1)).toBe(1)
    expect(easings.easeInOutCubic(0)).toBe(0)
    expect(easings.easeInOutCubic(0.5)).toBe(0.5)
    expect(easings.easeInOutCubic(1)).toBe(1)
  })

  it('should have quart easings', () => {
    expect(easings.easeInQuart(0)).toBe(0)
    expect(easings.easeInQuart(1)).toBe(1)
    expect(easings.easeOutQuart(0)).toBe(0)
    expect(easings.easeOutQuart(1)).toBe(1)
    expect(easings.easeInOutQuart(0)).toBe(0)
    expect(easings.easeInOutQuart(0.5)).toBe(0.5)
    expect(easings.easeInOutQuart(1)).toBe(1)
  })
})

describe('scrollControllerPlugin', () => {
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
      const plugin = scrollControllerPlugin()

      expect(plugin.name).toBe('scroll-controller')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('core')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should uninstall and stop animation', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.uninstall?.()

      expect(plugin.api?.isAnimating()).toBe(false)
    })
  })

  describe('scrollTo', () => {
    it('should scroll immediately with auto behavior', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollTo(500, { behavior: 'auto' })

      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 500,
        scrollLeft: 0,
      })
    })

    it('should scroll immediately without options', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollTo(300)

      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 300,
        scrollLeft: 0,
      })
    })

    it('should animate scroll with smooth behavior', async () => {
      const plugin = scrollControllerPlugin({ defaultDuration: 100 })
      plugin.install?.(kernel)

      plugin.api?.scrollTo(500, { behavior: 'smooth' })

      expect(plugin.api?.isAnimating()).toBe(true)

      // Advance halfway
      await vi.advanceTimersByTimeAsync(50)

      // Still animating
      expect(plugin.api?.isAnimating()).toBe(true)

      // Advance to completion
      await vi.advanceTimersByTimeAsync(100)

      expect(plugin.api?.isAnimating()).toBe(false)
    })

    it('should use custom easing', async () => {
      const customEasing = vi.fn((t: number) => t)
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollTo(500, { behavior: 'smooth', duration: 100, easing: customEasing })

      await vi.advanceTimersByTimeAsync(150)

      expect(customEasing).toHaveBeenCalled()
    })

    it('should not scroll without kernel', () => {
      const plugin = scrollControllerPlugin()

      // Don't install
      expect(() => plugin.api?.scrollTo(500)).not.toThrow()
    })

    it('should skip animation if distance is 0', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      // Kernel already at 0
      plugin.api?.scrollTo(0, { behavior: 'smooth', duration: 100 })

      expect(plugin.api?.isAnimating()).toBe(false)
    })

    it('should skip animation if duration is 0', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollTo(500, { behavior: 'smooth', duration: 0 })

      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 500,
        scrollLeft: 0,
      })
      expect(plugin.api?.isAnimating()).toBe(false)
    })
  })

  describe('scrollToIndex', () => {
    it('should scroll to index with start alignment', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToIndex(5, { align: 'start' })

      // Index 5 = offset 500
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 500,
        scrollLeft: 0,
      })
    })

    it('should scroll to index with center alignment', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToIndex(10, { align: 'center' })

      // Index 10 = offset 1000, viewport height 400, item size 100
      // Center: 1000 - 400/2 + 100/2 = 1000 - 200 + 50 = 850
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 850,
        scrollLeft: 0,
      })
    })

    it('should scroll to index with end alignment', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToIndex(10, { align: 'end' })

      // Index 10 = offset 1000, viewport height 400, item size 100
      // End: 1000 - 400 + 100 = 700
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 700,
        scrollLeft: 0,
      })
    })

    it('should scroll to index with auto alignment when item is above viewport', () => {
      kernel = createMockKernel({ scrollTop: 600 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      // Scroll to index 2 (offset 200) when at scrollTop 600
      plugin.api?.scrollToIndex(2, { align: 'auto' })

      // Item above viewport - scroll to start
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 200,
        scrollLeft: 0,
      })
    })

    it('should scroll to index with auto alignment when item is below viewport', () => {
      kernel = createMockKernel({ scrollTop: 0 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      // Scroll to index 10 (offset 1000) when at scrollTop 0, viewport 400
      plugin.api?.scrollToIndex(10, { align: 'auto' })

      // Item below viewport - scroll to show end
      // Item end: 1000 + 100 = 1100
      // Target: 1100 - 400 = 700
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 700,
        scrollLeft: 0,
      })
    })

    it('should not scroll when item is already visible with auto alignment', () => {
      kernel = createMockKernel({ scrollTop: 200 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      // Scroll to index 3 (offset 300) when at scrollTop 200, viewport 400
      // Item is within 200-600 range
      plugin.api?.scrollToIndex(3, { align: 'auto' })

      // Should not scroll
      expect(kernel.setScrollPosition).not.toHaveBeenCalled()
    })

    it('should apply offset adjustment', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToIndex(5, { align: 'start', offset: 50 })

      // Index 5 = offset 500 + 50 = 550
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 550,
        scrollLeft: 0,
      })
    })

    it('should clamp to valid scroll range', () => {
      kernel = createMockKernel({ totalSize: 500, viewportHeight: 400 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToIndex(10, { align: 'start' })

      // Max scroll: 500 - 400 = 100
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 100,
        scrollLeft: 0,
      })
    })

    it('should not scroll without kernel', () => {
      const plugin = scrollControllerPlugin()

      expect(() => plugin.api?.scrollToIndex(5)).not.toThrow()
    })
  })

  describe('scrollToTop', () => {
    it('should scroll to top', () => {
      kernel = createMockKernel({ scrollTop: 500 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToTop()

      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 0,
        scrollLeft: 0,
      })
    })

    it('should support smooth scrolling', async () => {
      kernel = createMockKernel({ scrollTop: 500 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToTop({ behavior: 'smooth', duration: 100 })

      expect(plugin.api?.isAnimating()).toBe(true)

      await vi.advanceTimersByTimeAsync(150)

      expect(plugin.api?.isAnimating()).toBe(false)
    })
  })

  describe('scrollToBottom', () => {
    it('should scroll to bottom', () => {
      kernel = createMockKernel({ scrollTop: 0, totalSize: 2000, viewportHeight: 400 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollToBottom()

      // Max scroll: 2000 - 400 = 1600
      expect(kernel.setScrollPosition).toHaveBeenCalledWith({
        scrollTop: 1600,
        scrollLeft: 0,
      })
    })

    it('should not scroll without kernel', () => {
      const plugin = scrollControllerPlugin()

      expect(() => plugin.api?.scrollToBottom()).not.toThrow()
    })
  })

  describe('getScrollPosition', () => {
    it('should return current scroll position', () => {
      kernel = createMockKernel({ scrollTop: 300 })
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      expect(plugin.api?.getScrollPosition()).toEqual({ scrollTop: 300, scrollLeft: 0 })
    })

    it('should return default without kernel', () => {
      const plugin = scrollControllerPlugin()

      expect(plugin.api?.getScrollPosition()).toEqual({ scrollTop: 0, scrollLeft: 0 })
    })
  })

  describe('isScrolling', () => {
    it('should return kernel scrolling state', () => {
      kernel = createMockKernel()
      ;(kernel.isScrolling as ReturnType<typeof vi.fn>).mockReturnValue(true)

      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      expect(plugin.api?.isScrolling()).toBe(true)
    })

    it('should return false without kernel', () => {
      const plugin = scrollControllerPlugin()

      expect(plugin.api?.isScrolling()).toBe(false)
    })
  })

  describe('stopAnimation', () => {
    it('should stop running animation', async () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      plugin.api?.scrollTo(1000, { behavior: 'smooth', duration: 500 })

      expect(plugin.api?.isAnimating()).toBe(true)

      plugin.api?.stopAnimation()

      expect(plugin.api?.isAnimating()).toBe(false)
    })

    it('should not throw when no animation running', () => {
      const plugin = scrollControllerPlugin()
      plugin.install?.(kernel)

      expect(() => plugin.api?.stopAnimation()).not.toThrow()
    })
  })
})
