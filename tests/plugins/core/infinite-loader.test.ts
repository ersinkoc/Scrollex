import { vi } from 'vitest'
import { infiniteLoaderPlugin, type LoadDirection, type InfiniteLoaderAPI } from '../../../src/plugins/core/infinite-loader.js'
import { createKernel } from '../../../src/kernel/kernel.js'
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

describe('infiniteLoaderPlugin superseded loads', () => {
  function setup() {
    const resolvers: Array<() => void> = []
    const onLoadMore = vi.fn(() => new Promise<void>((resolve) => { resolvers.push(resolve) }))
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, overscan: 0, direction: 'vertical' })
    const plugin = infiniteLoaderPlugin({ onLoadMore })
    kernel.register(plugin)
    return { kernel, plugin, api: plugin.api as InfiniteLoaderAPI, onLoadMore, resolvers }
  }

  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  }

  it('should keep a newer load locked when a load superseded by reset completes', async () => {
    const { api, onLoadMore, resolvers } = setup()
    api.triggerLoad('forward')
    api.reset()
    api.triggerLoad('forward')

    resolvers[0]!()
    await flush()

    expect(api.isLoading()).toBe(true)
    api.triggerLoad('forward')
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('should keep the load in flight locked across a reinstall and release it when that load completes', async () => {
    const { kernel, plugin, api, onLoadMore, resolvers } = setup()
    api.triggerLoad('forward')
    kernel.unregister('infinite-loader')
    kernel.register(plugin)

    expect(api.isLoading()).toBe(true)
    api.triggerLoad('forward')
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    resolvers[0]!()
    await flush()

    expect(api.isLoading()).toBe(false)
    api.triggerLoad('forward')
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })
})

describe('infiniteLoaderPlugin created again for the same kernel', () => {
  async function settle(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve()
  }

  function setup() {
    const resolvers: Array<() => void> = []
    const onLoadMore = vi.fn(() => new Promise<void>((resolve) => { resolvers.push(resolve) }))
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, overscan: 0, direction: 'vertical' })
    return { kernel, resolvers, onLoadMore }
  }

  it('should share the load in flight and release it when that load settles', async () => {
    const { kernel, resolvers, onLoadMore } = setup()
    const first = infiniteLoaderPlugin({ onLoadMore })
    kernel.register(first)
    ;(first.api as InfiniteLoaderAPI).triggerLoad('forward')
    kernel.unregister('infinite-loader')
    const second = infiniteLoaderPlugin({ onLoadMore })
    kernel.register(second)
    const api = second.api as InfiniteLoaderAPI

    expect(api.isLoading()).toBe(true)
    api.triggerLoad('forward')
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    resolvers[0]!()
    await settle()
    expect(api.isLoading()).toBe(false)
  })

  it('should share the has-more flags, restore the defaults on reset and not leak to another kernel', () => {
    const first = setup()
    const a = infiniteLoaderPlugin({ onLoadMore: first.onLoadMore })
    first.kernel.register(a)
    ;(a.api as InfiniteLoaderAPI).setHasMore(false)
    first.kernel.unregister('infinite-loader')
    const b = infiniteLoaderPlugin({ onLoadMore: first.onLoadMore })
    first.kernel.register(b)
    expect((b.api as InfiniteLoaderAPI).hasMore()).toBe(false)

    ;(b.api as InfiniteLoaderAPI).reset()
    expect((b.api as InfiniteLoaderAPI).hasMoreForward()).toBe(true)

    const second = setup()
    const c = infiniteLoaderPlugin({ onLoadMore: second.onLoadMore })
    second.kernel.register(c)
    ;(b.api as InfiniteLoaderAPI).setHasMore(false)
    expect((c.api as InfiniteLoaderAPI).hasMore()).toBe(true)
  })
})

describe('infiniteLoaderPlugin scroll check debounce', () => {
  let now = 1000

  beforeEach(() => {
    vi.useFakeTimers()
    now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function setup() {
    const onLoadMore = vi.fn(async () => {})
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50 })
    // thresholdItems -1: the visible-range check can never fire, only the pixel check is under test
    const plugin = infiniteLoaderPlugin({ threshold: 200, thresholdItems: -1, onLoadMore })
    kernel.register(plugin)
    const scroll = (scrollTop: number) => kernel.emit({ type: 'scroll', scrollTop, scrollLeft: 0, deltaY: 0, deltaX: 0, direction: 'down', timestamp: now })
    const wait = (ms: number) => { now += ms; vi.advanceTimersByTime(ms) }
    return { kernel, onLoadMore, scroll, wait }
  }

  it('should check the last event of a gesture that ended inside the debounce window', () => {
    const { kernel, onLoadMore, scroll, wait } = setup()

    scroll(100) // far from the end; opens the window
    wait(30)
    scroll(4900) // inside the bottom zone, and the last event
    expect(onLoadMore).not.toHaveBeenCalled()
    wait(400)

    expect(onLoadMore).toHaveBeenCalledTimes(1)
    expect(onLoadMore).toHaveBeenCalledWith('forward')
    kernel.destroy()
  })

  it('should check only the newest of several events inside the window', () => {
    const { kernel, onLoadMore, scroll, wait } = setup()

    scroll(100)
    wait(20)
    scroll(4900) // would load...
    wait(20)
    scroll(300) // ...but the reader went back up
    wait(400)

    expect(onLoadMore).not.toHaveBeenCalled()
    kernel.destroy()
  })

  it('should not check again after the plugin was uninstalled', () => {
    const { kernel, onLoadMore, scroll, wait } = setup()

    scroll(100)
    wait(30)
    scroll(4900)
    kernel.unregister('infinite-loader')
    wait(400)

    expect(onLoadMore).not.toHaveBeenCalled()
    kernel.destroy()
  })

  it('should still load right away for an event outside the window (control)', () => {
    const { kernel, onLoadMore, scroll, wait } = setup()

    scroll(100)
    wait(150)
    scroll(4900)

    expect(onLoadMore).toHaveBeenCalledTimes(1)
    kernel.destroy()
  })
})

describe('infiniteLoaderPlugin on a horizontal list', () => {
  function loadsAt(horizontal: boolean, offset: number): LoadDirection[] {
    vi.useFakeTimers()
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(container, 'clientHeight', { get: () => 400, configurable: true })
    const calls: LoadDirection[] = []
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 100, overscan: 0, direction: horizontal ? 'horizontal' : 'vertical' })
    kernel.register(infiniteLoaderPlugin({ direction: 'both', threshold: 200, thresholdItems: -1, onLoadMore: (d) => { calls.push(d) } }))
    kernel.attach(container)
    vi.advanceTimersByTime(1000)
    kernel.emit({ type: 'scroll', scrollTop: horizontal ? 0 : offset, scrollLeft: horizontal ? offset : 0, deltaY: 0, deltaX: 0, direction: 'none', timestamp: 0 } as ScrollEvent)
    kernel.destroy()
    vi.useRealTimers()
    return calls
  }

  it('should load forward and backward by the vertical position in a vertical list (control)', () => {
    expect(loadsAt(false, 5000)).toEqual([])
    expect(loadsAt(false, 9700)).toEqual(['forward'])
    expect(loadsAt(false, 0)).toEqual(['backward'])
  })

  it('should use scrollLeft and the viewport width in a horizontal list', () => {
    expect(loadsAt(true, 5000)).toEqual([])
    expect(loadsAt(true, 9800)).toEqual(['forward'])
    expect(loadsAt(true, 0)).toEqual(['backward'])
  })
})
