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
      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(3) // inclusive: items 0,1,2,3
      expect(range.overscanStartIndex).toBe(0)
      expect(range.overscanEndIndex).toBe(5) // +2 overscan
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

describe('createKernel horizontal scrolling', () => {
  it('should drive scrollLeft for scrollTo on a horizontal kernel', () => {
    const container = document.createElement('div')
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, direction: 'horizontal' })
    kernel.attach(container)

    kernel.scrollTo(300)

    expect(container.scrollLeft).toBe(300)
    expect(container.scrollTop).toBe(0)
  })

  it('should drive scrollLeft for scrollToIndex on a horizontal kernel', () => {
    const container = document.createElement('div')
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, direction: 'horizontal' })
    kernel.attach(container)

    kernel.scrollToIndex(20, { align: 'start' })

    expect(container.scrollLeft).toBe(1000)
    expect(container.scrollTop).toBe(0)
  })
})

describe('kernel attach and installed plugins', () => {
  it('should tell plugins installed before attach about the viewport', () => {
    const kernel = createKernel({ itemCount: 10 })
    const onResize = vi.fn()
    kernel.register({ name: 'probe', version: '1.0.0', type: 'optional', install: () => {}, uninstall: () => {}, hooks: { onResize } })

    kernel.attach(createMockContainer({ clientWidth: 320, clientHeight: 240 }))

    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith(expect.objectContaining({ width: 320, height: 240 }))
  })

  it('should not repeat the resize event when the same container is attached again', () => {
    const kernel = createKernel({ itemCount: 10 })
    const container = createMockContainer()
    const onResize = vi.fn()
    kernel.on('resize', onResize)

    kernel.attach(container)
    kernel.detach()
    kernel.attach(container)
    kernel.attach(container)

    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('should not emit a resize event for an empty container', () => {
    const kernel = createKernel({ itemCount: 10 })
    const onResize = vi.fn()
    kernel.on('resize', onResize)

    kernel.attach(createMockContainer({ clientWidth: 0, clientHeight: 0, scrollWidth: 0, scrollHeight: 0 }))

    expect(onResize).not.toHaveBeenCalled()
  })
})

describe('kernel layout changes that keep the visible range', () => {
  function attachedKernel() {
    const kernel = createKernel({ itemCount: 3, estimatedItemHeight: 50, overscan: 2 })
    kernel.attach(createMockContainer({ clientWidth: 300, clientHeight: 400 }))
    const onRange = vi.fn()
    kernel.on('visible-range-change', onRange)
    return { kernel, onRange }
  }

  it('should emit visible-range-change when a new estimate moves the offsets', () => {
    const { kernel, onRange } = attachedKernel()

    kernel.configure({ estimatedItemHeight: 100 })

    expect(onRange).toHaveBeenCalledTimes(1)
    expect(onRange.mock.calls[0]![0].range).toEqual(onRange.mock.calls[0]![0].previousRange)
    expect(kernel.getTotalSize()).toBe(300)
  })

  it('should emit visible-range-change when invalidating a measurement moves the offsets', () => {
    const { kernel, onRange } = attachedKernel()
    kernel.measureItem(0, 80)

    kernel.invalidateMeasurement(0)
    expect(onRange).toHaveBeenCalledTimes(1)

    kernel.invalidateAllMeasurements()
    expect(onRange).toHaveBeenCalledTimes(2)
  })

  it('should stay quiet when nothing moved', () => {
    const { kernel, onRange } = attachedKernel()

    kernel.configure({ estimatedItemHeight: 50 })
    kernel.invalidateMeasurement(1)
    kernel.configure({ overscan: 2 })

    expect(onRange).not.toHaveBeenCalled()
  })
})

describe('kernel paddingStart', () => {
  function paddedKernel(paddingStart?: number) {
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50, overscan: 0, ...(paddingStart === undefined ? {} : { paddingStart }) })
    const container = createMockContainer({ clientWidth: 300, clientHeight: 400 })
    kernel.attach(container)
    return { kernel, container }
  }

  it('should shift item offsets and the total size by the padding', () => {
    const { kernel } = paddedKernel(100)

    expect(kernel.getItemOffset(0)).toBe(100)
    expect(kernel.getItemOffset(99)).toBe(5050)
    expect(kernel.getTotalSize()).toBe(5100)
  })

  it('should compute the visible range for the part of the viewport that shows items', () => {
    const { kernel } = paddedKernel(100)

    // 400px viewport at scroll 0: 100px of padding, then 300px of items (rows 0..5, row 6 starts at the edge)
    expect(kernel.getVisibleRange().endIndex).toBe(5)
    expect(paddedKernel().kernel.getVisibleRange().endIndex).toBe(7)
  })

  it('should scroll to an index past the padding and clamp to the padded total', () => {
    const { kernel, container } = paddedKernel(100)

    kernel.scrollToIndex(10, { align: 'start' })
    expect(container.scrollTop).toBe(600)

    kernel.scrollToIndex(99, { align: 'end' })
    expect(container.scrollTop).toBe(5100 - 400)
  })

  it('should emit visible-range-change when the padding changes and stay quiet when it does not', () => {
    const { kernel } = paddedKernel(100)
    const onRange = vi.fn()
    kernel.on('visible-range-change', onRange)

    kernel.configure({ paddingStart: 100 })
    expect(onRange).not.toHaveBeenCalled()

    kernel.configure({ paddingStart: 0 })
    expect(onRange).toHaveBeenCalledTimes(1)
    expect(kernel.getTotalSize()).toBe(5000)
  })

  it('should leave a kernel without padding untouched', () => {
    const { kernel } = paddedKernel()

    expect('paddingStart' in kernel.getOptions()).toBe(false)
    expect(kernel.getItemOffset(0)).toBe(0)
    expect(kernel.getTotalSize()).toBe(5000)
  })
})

describe('createKernel scroll request beyond the end', () => {
  it('should report the position the container really has', () => {
    let top = 0
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { get: () => top, set: (v: number) => { top = Math.max(0, Math.min(4600, v)) }, configurable: true })
    Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 50 })
    kernel.attach(el)

    kernel.scrollTo(100000)
    kernel.scrollToIndex(95, { align: 'auto' })

    expect(el.scrollTop).toBe(4600)
    expect(kernel.getScrollPosition().scrollTop).toBe(4600)
    kernel.destroy()
  })
})

describe('createKernel measureItem input', () => {
  it('should ignore sizes that are not finite non-negative numbers', () => {
    const kernel = createKernel({ itemCount: 10, estimatedItemHeight: 50 })
    kernel.measureItem(0, 100)

    for (const size of [NaN, Infinity, -Infinity, -40]) kernel.measureItem(1, size)

    expect(kernel.getCachedHeight(1)).toBeUndefined()
    expect(kernel.getTotalSize()).toBe(1000)
    kernel.destroy()
  })

  it('should ignore indices that are not one of the current items and emit nothing for them', () => {
    const kernel = createKernel({ itemCount: 10, estimatedItemHeight: 50 })
    const handler = vi.fn()
    kernel.on('item-measured', handler)

    for (const index of [-1, 10, 30, 1.5, NaN]) kernel.measureItem(index, 500)
    kernel.configure({ itemCount: 50 })

    expect(handler).not.toHaveBeenCalled()
    expect(kernel.getTotalSize()).toBe(2500)
    kernel.destroy()
  })

  it('should still accept a zero height and the first and last index', () => {
    const kernel = createKernel({ itemCount: 4, estimatedItemHeight: 50 })

    kernel.measureItem(0, 0)
    kernel.measureItem(3, 70)

    expect(kernel.getCachedHeight(0)).toBe(0)
    expect(kernel.getCachedHeight(3)).toBe(70)
    kernel.destroy()
  })
})

describe('createKernel first visible range', () => {
  function container(height: number): HTMLElement {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientHeight', { get: () => height, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    return el
  }

  it('should announce the first range even when it equals the empty range the kernel starts with', () => {
    const kernel = createKernel({ itemCount: 1, estimatedItemHeight: 50, overscan: 0 })
    const handler = vi.fn()
    kernel.on('visible-range-change', handler)

    kernel.attach(container(600))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0].range).toMatchObject({ startIndex: 0, endIndex: 0, overscanEndIndex: 0 })
    kernel.destroy()
  })

  it('should not announce an unchanged range again on a later attach', () => {
    const kernel = createKernel({ itemCount: 1, estimatedItemHeight: 50, overscan: 0 })
    const handler = vi.fn()
    kernel.on('visible-range-change', handler)

    kernel.attach(container(600))
    kernel.detach()
    kernel.attach(container(600))

    expect(handler).toHaveBeenCalledTimes(1)
    kernel.destroy()
  })
})

describe('kernel scroll position offset and percentage', () => {
  function position(horizontal: boolean) {
  const el = document.createElement('div')
  let top = 0
  let left = 0
  Object.defineProperty(el, 'scrollTop', { get: () => top, set: (v: number) => { top = v }, configurable: true })
  Object.defineProperty(el, 'scrollLeft', { get: () => left, set: (v: number) => { left = v }, configurable: true })
  Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
  Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
  const kernel = createKernel({ itemCount: 100, estimatedItemHeight: 100, direction: horizontal ? 'horizontal' : 'vertical' })
  kernel.attach(el)
  // total 10000: scroll range 9600 (vertical) / 9700 (horizontal)
  kernel.setScrollPosition(horizontal ? { scrollLeft: 4850 } : { scrollTop: 4800 })
  const p = kernel.getScrollPosition()
  kernel.destroy()
  return p
}

  it('should report the offset along the list axis and the fraction of the scroll range', () => {
    expect(position(false)).toMatchObject({ scrollTop: 4800, offset: 4800, percentage: 0.5 })
    expect(position(true)).toMatchObject({ scrollLeft: 4850, offset: 4850, percentage: 0.5 })
  })

  it('should report 0 percent when nothing can scroll', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
    const kernel = createKernel({ itemCount: 3, estimatedItemHeight: 50 })
    kernel.attach(el)
    expect(kernel.getScrollPosition()).toMatchObject({ offset: 0, percentage: 0 })
    kernel.destroy()
  })
})
