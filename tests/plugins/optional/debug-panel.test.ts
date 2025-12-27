import { vi } from 'vitest'
import { debugPanel } from '../../../src/plugins/optional/debug-panel/debug-panel.js'
import type { Kernel } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: {
  itemCount?: number
  scrollTop?: number
  viewportHeight?: number
  totalSize?: number
} = {}): Kernel {
  const {
    itemCount = 100,
    scrollTop = 0,
    viewportHeight = 400,
    totalSize = 5000,
  } = options

  return {
    getItemCount: vi.fn(() => itemCount),
    getScrollPosition: vi.fn(() => ({ scrollTop, scrollLeft: 0 })),
    getVisibleRange: vi.fn(() => ({
      startIndex: 0,
      endIndex: 10,
      overscanStartIndex: 0,
      overscanEndIndex: 12,
    })),
    getRenderRange: vi.fn(() => ({
      startIndex: 0,
      endIndex: 12,
      overscanStartIndex: 0,
      overscanEndIndex: 14,
    })),
    getTotalSize: vi.fn(() => totalSize),
    getViewport: vi.fn(() => ({
      top: scrollTop,
      left: 0,
      width: 300,
      height: viewportHeight,
      bottom: scrollTop + viewportHeight,
      right: 300,
    })),
    isScrolling: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
    getEstimatedHeight: vi.fn(() => 50),
    invalidateMeasurement: vi.fn(),
    invalidateAllMeasurements: vi.fn(),
    emit: vi.fn(),
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

describe('debugPanel', () => {
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
      const plugin = debugPanel()

      expect(plugin.name).toBe('debug-panel')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should install with custom options', () => {
      const plugin = debugPanel({
        enabled: false,
        collapsed: true,
        position: 'top-right',
        theme: 'dark',
        showFps: false,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.isVisible()).toBe(false)
      expect(plugin.api?.isCollapsed()).toBe(true)
    })

    it('should uninstall and clean up', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)
      plugin.uninstall?.()

      // Should not throw after uninstall
      expect(plugin.api?.getStats()).toBeDefined()
    })
  })

  describe('visibility', () => {
    it('should toggle visibility', () => {
      const plugin = debugPanel({ enabled: true })
      plugin.install?.(kernel)

      expect(plugin.api?.isVisible()).toBe(true)

      plugin.api?.toggle()

      expect(plugin.api?.isVisible()).toBe(false)

      plugin.api?.toggle()

      expect(plugin.api?.isVisible()).toBe(true)
    })

    it('should show panel', () => {
      const plugin = debugPanel({ enabled: false })
      plugin.install?.(kernel)

      plugin.api?.show()

      expect(plugin.api?.isVisible()).toBe(true)
    })

    it('should hide panel', () => {
      const plugin = debugPanel({ enabled: true })
      plugin.install?.(kernel)

      plugin.api?.hide()

      expect(plugin.api?.isVisible()).toBe(false)
    })

    it('should not show if already visible', () => {
      const plugin = debugPanel({ enabled: true })
      plugin.install?.(kernel)

      plugin.api?.show()

      expect(plugin.api?.isVisible()).toBe(true)
    })

    it('should not hide if already hidden', () => {
      const plugin = debugPanel({ enabled: false })
      plugin.install?.(kernel)

      plugin.api?.hide()

      expect(plugin.api?.isVisible()).toBe(false)
    })
  })

  describe('collapsed state', () => {
    it('should set collapsed state', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      plugin.api?.setCollapsed(true)

      expect(plugin.api?.isCollapsed()).toBe(true)

      plugin.api?.setCollapsed(false)

      expect(plugin.api?.isCollapsed()).toBe(false)
    })
  })

  describe('tabs', () => {
    it('should set and get active tab', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      expect(plugin.api?.getActiveTab()).toBe('stats')

      plugin.api?.setActiveTab('events')

      expect(plugin.api?.getActiveTab()).toBe('events')
    })
  })

  describe('stats', () => {
    it('should return stats object', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      const stats = plugin.api?.getStats()

      expect(stats).toBeDefined()
      expect(stats).toHaveProperty('fps')
      expect(stats).toHaveProperty('frameTime')
      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('visibleItems')
      expect(stats).toHaveProperty('renderedItems')
      expect(stats).toHaveProperty('overscanItems')
      expect(stats).toHaveProperty('scrollPosition')
      expect(stats).toHaveProperty('isScrolling')
    })
  })

  describe('event log', () => {
    it('should return event log', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      const log = plugin.api?.getEventLog()

      expect(log).toBeDefined()
      expect(Array.isArray(log)).toBe(true)
    })

    it('should clear event log', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      plugin.api?.clearEventLog()

      expect(plugin.api?.getEventLog()).toHaveLength(0)
    })
  })

  describe('overlays', () => {
    it('should toggle viewport overlay', () => {
      const plugin = debugPanel({ showViewportOverlay: false })
      plugin.install?.(kernel)

      const api = plugin.api as any
      const initialState = api.getState().showViewportOverlay

      plugin.api?.toggleViewportOverlay()

      expect(api.getState().showViewportOverlay).toBe(!initialState)
    })

    it('should toggle item boundaries', () => {
      const plugin = debugPanel({ showItemBoundaries: false })
      plugin.install?.(kernel)

      const api = plugin.api as any
      const initialState = api.getState().showItemBoundaries

      plugin.api?.toggleItemBoundaries()

      expect(api.getState().showItemBoundaries).toBe(!initialState)
    })
  })

  describe('export', () => {
    it('should export data as JSON', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      const exported = plugin.api?.exportData()

      expect(exported).toBeDefined()

      const parsed = JSON.parse(exported!)

      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('stats')
      expect(parsed).toHaveProperty('eventLog')
      expect(parsed).toHaveProperty('options')
    })
  })

  describe('subscription', () => {
    it('should allow subscribing to state changes', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      const listener = vi.fn()
      const api = plugin.api as any

      const unsubscribe = api.subscribe(listener)

      plugin.api?.toggle()

      expect(listener).toHaveBeenCalled()

      unsubscribe()

      plugin.api?.toggle()

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('getState', () => {
    it('should return current state', () => {
      const plugin = debugPanel({ collapsed: true })
      plugin.install?.(kernel)

      const api = plugin.api as any
      const state = api.getState()

      expect(state).toHaveProperty('visible')
      expect(state).toHaveProperty('collapsed')
      expect(state.collapsed).toBe(true)
    })
  })

  describe('getOptions', () => {
    it('should return resolved options', () => {
      const plugin = debugPanel({ showFps: false })
      plugin.install?.(kernel)

      const api = plugin.api as any
      const options = api.getOptions()

      expect(options).toHaveProperty('showFps')
      expect(options.showFps).toBe(false)
    })
  })

  describe('getKernel', () => {
    it('should return kernel reference', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)

      const api = plugin.api as any
      expect(api.getKernel()).toBe(kernel)
    })

    it('should return null after uninstall', () => {
      const plugin = debugPanel()
      plugin.install?.(kernel)
      plugin.uninstall?.()

      const api = plugin.api as any
      expect(api.getKernel()).toBeNull()
    })
  })

  describe('updateStats', () => {
    it('should update stats from kernel periodically', async () => {
      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      // Wait for the stats update interval
      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.totalItems).toBe(100)
      expect(stats?.visibleItems).toBe(10)
      expect(stats?.renderedItems).toBe(12)
      expect(stats?.overscanItems).toBe(2)
      expect(stats?.avgItemHeight).toBe(50) // 5000 / 100
      expect(stats?.scrollPosition.scrollTop).toBe(0)
      expect(stats?.isScrolling).toBe(false)
    })

    it('should calculate scroll percentage', async () => {
      kernel = createMockKernel({ scrollTop: 2500, totalSize: 5000 })
      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.scrollPosition.percentage).toBe(0.5)
    })

    it('should handle zero total size', async () => {
      kernel = createMockKernel({ totalSize: 0 })
      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.scrollPosition.percentage).toBe(0)
    })

    it('should handle zero item count', async () => {
      kernel = createMockKernel({ itemCount: 0, totalSize: 0 })
      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.avgItemHeight).toBe(0)
    })

    it('should not update stats when not visible', async () => {
      const plugin = debugPanel({ enabled: false, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      // Stats should be initial values
      const stats = plugin.api?.getStats()
      expect(stats?.totalItems).toBe(0)
    })

    it('should start monitoring when shown', async () => {
      const plugin = debugPanel({ enabled: false, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      plugin.api?.show()

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()
      expect(stats?.totalItems).toBe(100)
    })
  })

  describe('logEvent', () => {
    it('should log events when logEvents is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const plugin = debugPanel({ logEvents: true })
      plugin.install?.(kernel)

      // Simulate kernel emitting an event
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
      onHandler({ type: 'scroll', scrollTop: 100 })

      const log = plugin.api?.getEventLog()

      expect(log?.length).toBeGreaterThan(0)
      expect(log?.[0].type).toBe('scroll')
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Scrollex Debug] scroll',
        expect.objectContaining({ type: 'scroll' })
      )

      consoleSpy.mockRestore()
    })

    it('should log events when active tab is events', () => {
      const plugin = debugPanel({ logEvents: false })
      plugin.install?.(kernel)

      // Set active tab to events
      plugin.api?.setActiveTab('events')

      // Simulate kernel emitting an event
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
      onHandler({ type: 'scroll', scrollTop: 100 })

      const log = plugin.api?.getEventLog()

      expect(log?.length).toBeGreaterThan(0)
      expect(log?.[0].type).toBe('scroll')
    })

    it('should not log events when disabled and not on events tab', () => {
      const plugin = debugPanel({ logEvents: false })
      plugin.install?.(kernel)

      // Keep on stats tab (default)
      expect(plugin.api?.getActiveTab()).toBe('stats')

      // Simulate kernel emitting an event
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
      onHandler({ type: 'scroll', scrollTop: 100 })

      const log = plugin.api?.getEventLog()

      // Should not log
      expect(log?.length).toBe(0)
    })

    it('should trim event log when exceeding max entries', () => {
      const plugin = debugPanel({ logEvents: true, maxEventLogEntries: 5 })
      plugin.install?.(kernel)

      // Simulate kernel emitting multiple events
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]

      for (let i = 0; i < 10; i++) {
        onHandler({ type: 'scroll', scrollTop: i * 100 })
      }

      const log = plugin.api?.getEventLog()

      expect(log?.length).toBe(5)
      // Most recent event should be first
      expect(log?.[0].data.scrollTop).toBe(900)
    })

    it('should assign unique ids to events', () => {
      const plugin = debugPanel({ logEvents: true })
      plugin.install?.(kernel)

      // Simulate kernel emitting multiple events
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
      onHandler({ type: 'scroll', scrollTop: 100 })
      onHandler({ type: 'scroll', scrollTop: 200 })

      const log = plugin.api?.getEventLog()

      expect(log?.[0].id).not.toBe(log?.[1].id)
    })

    it('should include timestamp in event log', () => {
      const plugin = debugPanel({ logEvents: true })
      plugin.install?.(kernel)

      // Simulate kernel emitting an event
      const onHandler = (kernel.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
      onHandler({ type: 'scroll', scrollTop: 100 })

      const log = plugin.api?.getEventLog()

      expect(log?.[0].timestamp).toBeDefined()
      expect(typeof log?.[0].timestamp).toBe('number')
    })
  })

  describe('FPS monitoring', () => {
    it('should update FPS over time', async () => {
      const plugin = debugPanel({ enabled: true, showFps: true })
      plugin.install?.(kernel)

      // Run for a bit to accumulate frames
      await vi.advanceTimersByTimeAsync(2000)

      const stats = plugin.api?.getStats()

      // FPS should be calculated
      expect(stats?.fps).toBeDefined()
      expect(typeof stats?.fps).toBe('number')
    })

    it('should track frame time', async () => {
      const plugin = debugPanel({ enabled: true })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.frameTime).toBeDefined()
      expect(typeof stats?.frameTime).toBe('number')
    })
  })

  describe('memory usage', () => {
    it('should include memory usage when available', async () => {
      // Mock performance.memory (Chrome-only API)
      const mockMemory = { usedJSHeapSize: 50 * 1024 * 1024 } // 50 MB
      const originalPerformance = global.performance

      Object.defineProperty(global.performance, 'memory', {
        value: mockMemory,
        configurable: true,
      })

      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.memoryUsage).toBe(50)

      // Clean up
      delete (global.performance as any).memory
    })

    it('should handle memory being undefined', async () => {
      // Ensure performance.memory is defined but returns undefined
      const originalPerformance = global.performance

      Object.defineProperty(global.performance, 'memory', {
        value: undefined,
        configurable: true,
      })

      const plugin = debugPanel({ enabled: true, statsUpdateInterval: 50 })
      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(100)

      const stats = plugin.api?.getStats()

      expect(stats?.memoryUsage).toBeNull()

      // Clean up
      delete (global.performance as any).memory
    })
  })
})
