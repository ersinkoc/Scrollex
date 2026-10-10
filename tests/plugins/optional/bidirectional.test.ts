import { vi } from 'vitest'
import { bidirectional } from '../../../src/plugins/optional/bidirectional.js'
import { createKernel } from '../../../src/kernel/kernel.js'
import type { Kernel, ScrollEvent } from '../../../src/types.js'
import type { BidirectionalAPI } from '../../../src/plugins/optional/bidirectional.js'

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
    it('should call onLoadMore once while the scroll stays inside a zone', () => {
      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400, scrollTop: 150 })
      const onLoadMore = vi.fn()
      const plugin = bidirectional({ onLoadMore, loadMoreThreshold: 200 })
      plugin.install?.(kernel)

      for (const top of [150, 100, 50, 0, 0, 20]) {
        plugin.hooks?.onScroll?.(createScrollEvent(top))
      }

      expect(onLoadMore).toHaveBeenCalledTimes(1)
      expect(onLoadMore).toHaveBeenCalledWith('backward')
    })

    it('should call onLoadMore again after leaving the zone or after the items change', () => {
      kernel = createMockKernel({ totalSize: 5000, viewportHeight: 400, scrollTop: 100 })
      const onLoadMore = vi.fn()
      const plugin = bidirectional({ onLoadMore, loadMoreThreshold: 200 })
      plugin.install?.(kernel)

      plugin.hooks?.onScroll?.(createScrollEvent(100))
      plugin.hooks?.onScroll?.(createScrollEvent(2000)) // left the zone
      plugin.hooks?.onScroll?.(createScrollEvent(100)) // re-entered
      expect(onLoadMore).toHaveBeenCalledTimes(2)

      plugin.hooks?.onItemsChange?.(120, 100) // data arrived, scroll still inside the zone
      plugin.hooks?.onScroll?.(createScrollEvent(90))
      expect(onLoadMore).toHaveBeenCalledTimes(3)
    })

    it('should position at the bottom only once per kernel', async () => {
      kernel = createMockKernel({ totalSize: 5000 })
      const first = bidirectional({ initialPosition: 'bottom' })
      first.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)
      first.uninstall?.()
      expect(kernel.scrollTo).toHaveBeenCalledTimes(1)

      const second = bidirectional({ initialPosition: 'bottom' })
      second.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledTimes(1)
    })

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

describe('bidirectional sticking with a real kernel', () => {
  let queue: Array<FrameRequestCallback | null> = []
  const realRaf = globalThis.requestAnimationFrame
  const realCancel = globalThis.cancelAnimationFrame

  beforeEach(() => {
    queue = []
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
  })

  afterEach(() => {
    globalThis.requestAnimationFrame = realRaf
    globalThis.cancelAnimationFrame = realCancel
  })

  const flush = () => { for (let i = 0; i < 4; i++) { const q = queue; queue = []; q.forEach((cb) => cb?.(0)) } }

  function setup() {
    let top = 0
    let kernel!: ReturnType<typeof createKernel>
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { get: () => top, set: (v: number) => { top = Math.max(0, Math.min(Math.max(0, kernel.getTotalSize() - 200), v)) }, configurable: true })
    Object.defineProperty(el, 'clientHeight', { get: () => 200, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50 })
    kernel.attach(el)
    return { kernel, scrollTop: () => top, scrollTo: (v: number) => { top = v; el.dispatchEvent(new Event('scroll')); flush() } }
  }

  it('should stay at the top when items are appended to a list that starts at the top', () => {
    const { kernel, scrollTop } = setup()
    kernel.register(bidirectional({ initialPosition: 'top' }))
    flush()

    kernel.configure({ itemCount: 101 })
    flush()

    expect(scrollTop()).toBe(0)
    kernel.destroy()
  })

  it('should follow the bottom when items are appended to a list that starts at the bottom', () => {
    const { kernel, scrollTop } = setup()
    kernel.register(bidirectional({ initialPosition: 'bottom' }))
    flush()
    expect(scrollTop()).toBe(4800)

    kernel.configure({ itemCount: 101 })
    flush()

    expect(scrollTop()).toBe(4850)
    kernel.destroy()
  })

  it('should not pull a reader who scrolled away back to the bottom after the plugin was created again', () => {
    const { kernel, scrollTop, scrollTo } = setup()
    kernel.register(bidirectional({ initialPosition: 'bottom' }))
    flush()
    scrollTo(1000) // the reader scrolled up
    kernel.unregister('bidirectional')
    kernel.register(bidirectional({ initialPosition: 'bottom' }))
    flush()

    kernel.configure({ itemCount: 101 })
    flush()

    expect(scrollTop()).toBe(1000)
    kernel.destroy()
  })
})

describe('bidirectional on a horizontal list', () => {
  function setup(horizontal: boolean) {
    const tops = { top: 0, left: 0 }
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { get: () => tops.top, set: (v: number) => { tops.top = v }, configurable: true })
    Object.defineProperty(el, 'scrollLeft', { get: () => tops.left, set: (v: number) => { tops.left = v }, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
    const loads: string[] = []
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 100, overscan: 0, direction: horizontal ? 'horizontal' : 'vertical' })
    const plugin = bidirectional({ loadMoreThreshold: 200, onLoadMore: (d: string) => { loads.push(d) } } as never)
    kernel.register(plugin)
    kernel.attach(el)
    return { kernel, el, tops, loads, api: plugin.api as BidirectionalAPI }
  }
  const scrollEvent = (offset: number, horizontal: boolean) => ({ type: 'scroll', scrollTop: horizontal ? 0 : offset, scrollLeft: horizontal ? offset : 0, deltaY: 0, deltaX: 0, direction: 'none', timestamp: 0 }) as never
  
  function run(horizontal: boolean) {
    const s = setup(horizontal)
    s.kernel.emit(scrollEvent(5000, horizontal))
    const middleLoads = [...s.loads]
    // at the end: total 10000, viewport 300 (horizontal) / 400 (vertical)
    if (horizontal) s.tops.left = 9700; else s.tops.top = 9600
    s.kernel.setScrollPosition(horizontal ? { scrollLeft: horizontal ? 9700 : 0 } : { scrollTop: 9600 })
    const atEnd = s.api.isAtBottom()
    s.tops.top = 0; s.tops.left = 0
    s.kernel.setScrollPosition({ scrollTop: 0, scrollLeft: 0 })
    s.api.adjustForPrepend(200)
    const moved = horizontal ? s.tops.left : s.tops.top
    const strayAxis = horizontal ? s.tops.top : s.tops.left
    s.kernel.destroy()
    return { middleLoads, atEnd, moved, strayAxis }
  }

  it('should behave like a vertical list along its own axis (control: the vertical list)', () => {
    const vertical = run(false)
    const horizontal = run(true)
    expect(vertical).toEqual({ middleLoads: [], atEnd: true, moved: 200, strayAxis: 0 })
    expect(horizontal).toEqual(vertical)
  })
})
