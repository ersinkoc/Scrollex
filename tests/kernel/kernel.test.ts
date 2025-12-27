import { vi } from 'vitest'
import { createKernel, createPlugin } from '../../src/kernel/kernel.js'
import type { Plugin, Kernel } from '../../src/types.js'

function createMockContainer(options: {
  clientWidth?: number
  clientHeight?: number
  scrollWidth?: number
  scrollHeight?: number
  scrollTop?: number
  scrollLeft?: number
} = {}): HTMLElement {
  const container = document.createElement('div')

  Object.defineProperties(container, {
    clientWidth: { value: options.clientWidth ?? 500, configurable: true },
    clientHeight: { value: options.clientHeight ?? 400, configurable: true },
    scrollWidth: { value: options.scrollWidth ?? 500, configurable: true },
    scrollHeight: { value: options.scrollHeight ?? 2000, configurable: true },
    scrollTop: { value: options.scrollTop ?? 0, writable: true, configurable: true },
    scrollLeft: { value: options.scrollLeft ?? 0, writable: true, configurable: true },
  })

  return container
}

describe('createKernel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should create kernel with default options', () => {
      const kernel = createKernel()

      expect(kernel.getItemCount()).toBe(0)
      expect(kernel.getEstimatedHeight()).toBe(50)
    })

    it('should create kernel with custom options', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 75,
        overscan: 10,
      })

      expect(kernel.getItemCount()).toBe(100)
      expect(kernel.getEstimatedHeight()).toBe(75)
    })
  })

  describe('plugin management', () => {
    it('should register and get plugins', () => {
      const kernel = createKernel()
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'optional',
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      kernel.register(plugin)

      expect(kernel.getPlugin('test-plugin')).toBe(plugin)
      expect(plugin.install).toHaveBeenCalledWith(kernel)
    })

    it('should unregister plugins', () => {
      const kernel = createKernel()
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'optional',
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      kernel.register(plugin)
      kernel.unregister('test-plugin')

      expect(kernel.getPlugin('test-plugin')).toBeUndefined()
      expect(plugin.uninstall).toHaveBeenCalled()
    })

    it('should list all plugins', () => {
      const kernel = createKernel()
      kernel.register({
        name: 'plugin-1',
        version: '1.0.0',
        type: 'core',
        install: vi.fn(),
        uninstall: vi.fn(),
      })
      kernel.register({
        name: 'plugin-2',
        version: '2.0.0',
        type: 'optional',
        install: vi.fn(),
        uninstall: vi.fn(),
      })

      const plugins = kernel.listPlugins()

      expect(plugins).toHaveLength(2)
      expect(plugins.map((p) => p.name)).toContain('plugin-1')
      expect(plugins.map((p) => p.name)).toContain('plugin-2')
    })
  })

  describe('scroll control', () => {
    it('should get and set scroll position', () => {
      const kernel = createKernel()
      const container = createMockContainer()

      kernel.attach(container)
      kernel.setScrollPosition({ scrollTop: 100, scrollLeft: 50 })

      const pos = kernel.getScrollPosition()
      expect(pos.scrollTop).toBe(100)
      expect(pos.scrollLeft).toBe(50)
    })

    it('should scroll to offset', () => {
      const kernel = createKernel()
      const container = createMockContainer()

      kernel.attach(container)
      kernel.scrollTo(200)

      expect(kernel.getScrollPosition().scrollTop).toBe(200)
    })

    it('should scroll to index with start alignment', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })
      const container = createMockContainer()

      kernel.attach(container)
      kernel.scrollToIndex(10, { align: 'start' })

      expect(kernel.getScrollPosition().scrollTop).toBe(500) // 10 * 50
    })

    it('should scroll to index with center alignment', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })
      const container = createMockContainer({ clientHeight: 400 })

      kernel.attach(container)
      kernel.scrollToIndex(10, { align: 'center' })

      // itemOffset (500) - viewport/2 (200) + itemSize/2 (25) = 325
      expect(kernel.getScrollPosition().scrollTop).toBe(325)
    })

    it('should scroll to index with end alignment', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })
      const container = createMockContainer({ clientHeight: 400 })

      kernel.attach(container)
      kernel.scrollToIndex(10, { align: 'end' })

      // itemOffset (500) - viewport (400) + itemSize (50) = 150
      expect(kernel.getScrollPosition().scrollTop).toBe(150)
    })

    it('should not scroll for visible items with auto alignment', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })
      const container = createMockContainer({ clientHeight: 400 })

      kernel.attach(container)
      kernel.scrollToIndex(5, { align: 'auto' })

      // Item 5 is at offset 250, visible in viewport 0-400
      expect(kernel.getScrollPosition().scrollTop).toBe(0)
    })
  })

  describe('measurement', () => {
    it('should measure items', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })

      kernel.measureItem(0, 75)

      expect(kernel.getCachedHeight(0)).toBe(75)
    })

    it('should emit item-measured event', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })
      const handler = vi.fn()

      kernel.on('item-measured', handler)
      kernel.measureItem(5, 100)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'item-measured',
          index: 5,
          height: 100,
        })
      )
    })

    it('should invalidate measurements', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })

      kernel.measureItem(0, 75)
      kernel.invalidateMeasurement(0)

      expect(kernel.getCachedHeight(0)).toBeUndefined()
    })

    it('should invalidate all measurements', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
      })

      kernel.measureItem(0, 75)
      kernel.measureItem(1, 80)
      kernel.invalidateAllMeasurements()

      expect(kernel.getCachedHeight(0)).toBeUndefined()
      expect(kernel.getCachedHeight(1)).toBeUndefined()
    })

    it('should get item offset', () => {
      const kernel = createKernel({
        itemCount: 10,
        estimatedItemHeight: 100,
      })

      expect(kernel.getItemOffset(5)).toBe(500)
    })
  })

  describe('events', () => {
    it('should subscribe to events', () => {
      const kernel = createKernel()
      const handler = vi.fn()

      kernel.on('scroll', handler)
      kernel.emit({ type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 0, deltaX: 0, direction: 'down', timestamp: Date.now() })

      expect(handler).toHaveBeenCalled()
    })

    it('should unsubscribe from events', () => {
      const kernel = createKernel()
      const handler = vi.fn()

      kernel.on('scroll', handler)
      kernel.off('scroll', handler)
      kernel.emit({ type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 0, deltaX: 0, direction: 'down', timestamp: Date.now() })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should return unsubscribe function', () => {
      const kernel = createKernel()
      const handler = vi.fn()

      const unsub = kernel.on('scroll', handler)
      unsub()
      kernel.emit({ type: 'scroll', scrollTop: 100, scrollLeft: 0, deltaY: 0, deltaX: 0, direction: 'down', timestamp: Date.now() })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('should update item count', () => {
      const kernel = createKernel({ itemCount: 10 })

      kernel.configure({ itemCount: 50 })

      expect(kernel.getItemCount()).toBe(50)
    })

    it('should emit items-change event', () => {
      const kernel = createKernel({ itemCount: 10 })
      const handler = vi.fn()

      kernel.on('items-change', handler)
      kernel.configure({ itemCount: 50 })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'items-change',
          count: 50,
          previousCount: 10,
        })
      )
    })

    it('should update estimated height', () => {
      const kernel = createKernel({ estimatedItemHeight: 50 })

      kernel.configure({ estimatedItemHeight: 100 })

      expect(kernel.getEstimatedHeight()).toBe(100)
    })

    it('should get options', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 75,
        overscan: 3,
      })

      const options = kernel.getOptions()

      expect(options.itemCount).toBe(100)
      expect(options.estimatedItemHeight).toBe(75)
      expect(options.overscan).toBe(3)
    })
  })

  describe('state', () => {
    it('should report scrolling state', () => {
      const kernel = createKernel()
      const container = createMockContainer()

      kernel.attach(container)

      expect(kernel.isScrolling()).toBe(false)
    })

    it('should get total size', () => {
      const kernel = createKernel({
        itemCount: 20,
        estimatedItemHeight: 50,
      })

      expect(kernel.getTotalSize()).toBe(1000)
    })

    it('should get visible range', () => {
      const kernel = createKernel({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 2,
      })
      const container = createMockContainer({ clientHeight: 200 })

      kernel.attach(container)

      const range = kernel.getVisibleRange()

      // Container is 200px, items are 50px = 4 visible items
      // Implementation uses exclusive end index
      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(4) // exclusive: items 0,1,2,3
      expect(range.overscanStartIndex).toBe(0)
      expect(range.overscanEndIndex).toBe(6) // +2 overscan
    })
  })

  describe('lifecycle', () => {
    it('should attach to container', () => {
      const kernel = createKernel()
      const container = createMockContainer()

      kernel.attach(container)

      expect(kernel.getViewport().height).toBe(400)
    })

    it('should detach from container', () => {
      const kernel = createKernel()
      const container = createMockContainer()

      kernel.attach(container)
      kernel.detach()

      // Should not throw when interacting after detach
      expect(() => kernel.getVisibleRange()).not.toThrow()
    })

    it('should destroy kernel', () => {
      const kernel = createKernel()
      const container = createMockContainer()
      const plugin: Plugin = {
        name: 'test',
        version: '1.0.0',
        type: 'optional',
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      kernel.register(plugin)
      kernel.attach(container)
      kernel.destroy()

      expect(kernel.getPlugin('test')).toBeUndefined()
    })

    it('should re-attach to new container', () => {
      const kernel = createKernel()
      const container1 = createMockContainer({ clientHeight: 400 })
      const container2 = createMockContainer({ clientHeight: 600 })

      kernel.attach(container1)
      expect(kernel.getViewport().height).toBe(400)

      kernel.attach(container2)
      expect(kernel.getViewport().height).toBe(600)
    })
  })
})

describe('createPlugin', () => {
  it('should create a plugin', () => {
    const installFn = vi.fn()
    const uninstallFn = vi.fn()

    const plugin = createPlugin({
      name: 'my-plugin',
      version: '1.0.0',
      type: 'optional',
      install: installFn,
      uninstall: uninstallFn,
    })

    expect(plugin.name).toBe('my-plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.type).toBe('optional')
  })

  it('should call install function', () => {
    const installFn = vi.fn()
    const kernel = createKernel()

    const plugin = createPlugin({
      name: 'my-plugin',
      version: '1.0.0',
      type: 'optional',
      install: installFn,
    })

    plugin.install?.(kernel)

    expect(installFn).toHaveBeenCalledWith(kernel)
  })

  it('should call uninstall function', () => {
    const uninstallFn = vi.fn()

    const plugin = createPlugin({
      name: 'my-plugin',
      version: '1.0.0',
      type: 'optional',
      install: vi.fn(),
      uninstall: uninstallFn,
    })

    plugin.uninstall?.()

    expect(uninstallFn).toHaveBeenCalled()
  })

  it('should include hooks', () => {
    const onScrollFn = vi.fn()
    const plugin = createPlugin({
      name: 'my-plugin',
      version: '1.0.0',
      type: 'optional',
      install: vi.fn(),
      hooks: {
        onScroll: onScrollFn,
      },
    })

    expect(plugin.hooks?.onScroll).toBeDefined()
  })

  it('should include api', () => {
    const plugin = createPlugin({
      name: 'my-plugin',
      version: '1.0.0',
      type: 'optional',
      install: vi.fn(),
      api: {
        customMethod: () => 'result',
      },
    })

    expect((plugin.api as { customMethod: () => string }).customMethod()).toBe('result')
  })
})
