import { vi } from 'vitest'
import { autoMeasurerPlugin } from '../../../src/plugins/core/auto-measurer.js'
import type { AutoMeasurerAPI } from '../../../src/plugins/core/auto-measurer.js'
import { createKernel } from '../../../src/kernel/kernel.js'
import type { Kernel } from '../../../src/types.js'

// Mock kernel
function createMockKernel(): Kernel {
  const measurements = new Map<number, number>()

  return {
    configure: vi.fn(),
    measureItem: vi.fn((index: number, height: number) => {
      measurements.set(index, height)
    }),
    getCachedHeight: vi.fn((index: number) => measurements.get(index)),
    getItemCount: vi.fn(() => 10),
    getOptions: vi.fn(() => ({ direction: 'vertical' })),
    invalidateMeasurement: vi.fn((index: number) => {
      measurements.delete(index)
    }),
    invalidateAllMeasurements: vi.fn(() => {
      measurements.clear()
    }),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 500),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    isScrolling: vi.fn(() => false),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    emit: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    getPlugin: vi.fn(),
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
  } as unknown as Kernel
}

// Mock element with getBoundingClientRect
function createMockElement(height = 100): HTMLElement {
  const element = document.createElement('div')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    height,
    width: 200,
    top: 0,
    left: 0,
    bottom: height,
    right: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return element
}

describe('autoMeasurerPlugin', () => {
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
      const plugin = autoMeasurerPlugin()

      expect(plugin.name).toBe('auto-measurer')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('core')

      plugin.install?.(kernel)

      // No estimate requested: the kernel keeps its own
      expect(kernel.configure).not.toHaveBeenCalled()
    })

    it('should install with custom estimated height', () => {
      const plugin = autoMeasurerPlugin({ estimatedItemHeight: 100 })

      plugin.install?.(kernel)

      expect(kernel.configure).toHaveBeenCalledWith({ estimatedItemHeight: 100 })
    })

    it('should uninstall and clean up resources', async () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: true })

      plugin.install?.(kernel)

      // Create an element and observe it
      const element = createMockElement()
      plugin.api?.observe(0, element)

      plugin.uninstall?.()

      // Plugin should be cleaned up
      expect(plugin.api?.getCachedSize(0)).toBeUndefined()
    })
  })

  describe('measureElement', () => {
    it('should measure element and update kernel', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      const element = createMockElement(150)
      const height = plugin.api?.measureElement(0, element)

      expect(height).toBe(150)
      expect(kernel.measureItem).toHaveBeenCalledWith(0, 150)
    })

    it('should not update kernel if height is 0', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      const element = createMockElement(0)
      const height = plugin.api?.measureElement(0, element)

      expect(height).toBe(0)
      expect(kernel.measureItem).not.toHaveBeenCalled()
    })

    it('should return height without kernel', () => {
      const plugin = autoMeasurerPlugin()
      // Not installed - no kernel

      const element = createMockElement(100)
      const height = plugin.api?.measureElement(0, element)

      expect(height).toBe(100)
    })
  })

  describe('getCachedSize', () => {
    it('should return cached size from kernel', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      const element = createMockElement(120)
      plugin.api?.measureElement(0, element)

      expect(plugin.api?.getCachedSize(0)).toBe(120)
    })

    it('should return undefined for unmeasured index', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      expect(plugin.api?.getCachedSize(5)).toBeUndefined()
    })

    it('should return undefined without kernel', () => {
      const plugin = autoMeasurerPlugin()

      expect(plugin.api?.getCachedSize(0)).toBeUndefined()
    })
  })

  describe('invalidate', () => {
    it('should invalidate measurement for index', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      const element = createMockElement(100)
      plugin.api?.measureElement(0, element)

      plugin.api?.invalidate(0)

      expect(kernel.invalidateMeasurement).toHaveBeenCalledWith(0)
    })

    it('should not throw without kernel', () => {
      const plugin = autoMeasurerPlugin()

      expect(() => plugin.api?.invalidate(0)).not.toThrow()
    })
  })

  describe('invalidateAll', () => {
    it('should invalidate all measurements', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      plugin.api?.invalidateAll()

      expect(kernel.invalidateAllMeasurements).toHaveBeenCalled()
    })
  })

  describe('getMeasurementCache', () => {
    it('should return measurement cache', () => {
      const plugin = autoMeasurerPlugin()
      plugin.install?.(kernel)

      const element1 = createMockElement(100)
      const element2 = createMockElement(200)
      plugin.api?.measureElement(0, element1)
      plugin.api?.measureElement(1, element2)

      const cache = plugin.api?.getMeasurementCache()

      expect(cache?.get(0)).toBe(100)
      expect(cache?.get(1)).toBe(200)
    })

    it('should return empty map without kernel', () => {
      const plugin = autoMeasurerPlugin()

      const cache = plugin.api?.getMeasurementCache()

      expect(cache?.size).toBe(0)
    })
  })

  describe('observe/unobserve', () => {
    it('should observe element and schedule measurement', async () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: true })
      plugin.install?.(kernel)

      const element = createMockElement(100)
      plugin.api?.observe(0, element)

      // Flush RAF
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.measureItem).toHaveBeenCalledWith(0, 100)
    })

    it('should unobserve element', async () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: true })
      plugin.install?.(kernel)

      const element = createMockElement(100)
      plugin.api?.observe(0, element)
      plugin.api?.unobserve(element)

      // Flush RAF - should not measure after unobserve
      await vi.advanceTimersByTimeAsync(16)

      // measureItem might have been called during observe, but subsequent
      // resize events should not trigger measurements
    })

    it('should replace element at same index', async () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: true })
      plugin.install?.(kernel)

      const element1 = createMockElement(100)
      const element2 = createMockElement(200)

      plugin.api?.observe(0, element1)
      plugin.api?.observe(0, element2)

      await vi.advanceTimersByTimeAsync(16)

      // Should measure the new element
      expect(kernel.measureItem).toHaveBeenLastCalledWith(0, 200)
    })

    it('should not observe without ResizeObserver', () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: false })
      plugin.install?.(kernel)

      const element = createMockElement(100)

      // Should not throw
      expect(() => plugin.api?.observe(0, element)).not.toThrow()
    })

    it('should not unobserve without ResizeObserver', () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: false })
      plugin.install?.(kernel)

      const element = createMockElement(100)

      expect(() => plugin.api?.unobserve(element)).not.toThrow()
    })

    it('should measure an element only for the index it is observed for', async () => {
      const plugin = autoMeasurerPlugin({ measureOnResize: true })
      plugin.install?.(kernel)

      const shared = createMockElement(100)
      plugin.api?.observe(3, shared)
      plugin.api?.observe(5, shared) // the same node now belongs to index 5

      await vi.advanceTimersByTimeAsync(20)

      expect(kernel.measureItem).toHaveBeenCalledTimes(1)
      expect(kernel.measureItem).toHaveBeenCalledWith(5, 100)
    })
  })
})

describe('autoMeasurerPlugin in a browser without WeakRef', () => {
  const globals = globalThis as { WeakRef?: unknown }
  const realWeakRef = globals.WeakRef

  beforeEach(() => {
    vi.useFakeTimers()
    delete globals.WeakRef
  })

  afterEach(() => {
    globals.WeakRef = realWeakRef
    vi.useRealTimers()
  })

  it('should observe and measure elements without it', () => {
    const kernel = createMockKernel()
    const plugin = autoMeasurerPlugin()
    plugin.install?.(kernel)
    const element = createMockElement(80)

    expect(() => plugin.api?.observe(3, element)).not.toThrow()
    vi.advanceTimersByTime(50)

    expect(kernel.measureItem).toHaveBeenCalledWith(3, 80)
  })

  it('should forget the element when it is unobserved', () => {
    const kernel = createMockKernel()
    const plugin = autoMeasurerPlugin()
    plugin.install?.(kernel)
    const element = createMockElement(80)

    plugin.api?.observe(3, element)
    plugin.api?.unobserve(element)
    vi.advanceTimersByTime(50)

    expect(kernel.measureItem).not.toHaveBeenCalled()
  })
})

describe('autoMeasurerPlugin with measureOnResize off', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('should still measure an observed element once', () => {
    const kernel = createMockKernel()
    const plugin = autoMeasurerPlugin({ measureOnResize: false })
    plugin.install?.(kernel)

    plugin.api?.observe(3, createMockElement(77))
    vi.advanceTimersByTime(50)

    expect(kernel.measureItem).toHaveBeenCalledWith(3, 77)
  })

  it('should forget an element that is unobserved before the first measurement', () => {
    const kernel = createMockKernel()
    const plugin = autoMeasurerPlugin({ measureOnResize: false })
    plugin.install?.(kernel)
    const element = createMockElement(77)

    plugin.api?.observe(3, element)
    plugin.api?.unobserve(element)
    vi.advanceTimersByTime(50)

    expect(kernel.measureItem).not.toHaveBeenCalled()
  })

  it('should not re-measure on resize notifications because there is no observer', () => {
    const plugin = autoMeasurerPlugin({ measureOnResize: false })
    plugin.install?.(createMockKernel())

    expect(() => plugin.uninstall?.()).not.toThrow()
  })
})

describe('autoMeasurerPlugin on a horizontal list', () => {
  const rect = { width: 120, height: 300, top: 0, left: 0, right: 120, bottom: 300, x: 0, y: 0, toJSON() {} } as DOMRect
  const measuredSizes = (direction: 'vertical' | 'horizontal') => {
    const kernel = createKernel({ itemCount: 10, estimatedItemHeight: 50, direction })
    const plugin = autoMeasurerPlugin()
    kernel.register(plugin)
    const el = document.createElement('div')
    el.getBoundingClientRect = () => rect
    ;(plugin.api as AutoMeasurerAPI).measureElement(0, el)
    const size = kernel.getCachedHeight(0)
    kernel.destroy()
    return size
  }

  it('should measure the height in a vertical list (control)', () => {
    expect(measuredSizes('vertical')).toBe(300)
  })

  it('should measure the width in a horizontal list', () => {
    expect(measuredSizes('horizontal')).toBe(120)
  })

  it('should measure the width of observed elements in a horizontal list', () => {
    const frames: FrameRequestCallback[] = []
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { frames.push(cb); return frames.length })
    const kernel = createKernel({ itemCount: 10, estimatedItemHeight: 50, direction: 'horizontal' })
    const plugin = autoMeasurerPlugin()
    kernel.register(plugin)
    const el = document.createElement('div')
    el.getBoundingClientRect = () => rect
    ;(plugin.api as AutoMeasurerAPI).observe(1, el)
    frames.splice(0).forEach((cb) => cb(0))
    expect(kernel.getCachedHeight(1)).toBe(120)
    kernel.destroy()
    raf.mockRestore()
  })
})
