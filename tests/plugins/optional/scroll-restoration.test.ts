import { vi } from 'vitest'
import { createKernel } from '../../../src/kernel/kernel.js'
import { scrollRestoration } from '../../../src/plugins/optional/scroll-restoration.js'
import type { Kernel, ScrollEvent } from '../../../src/types.js'

// Mock storage
function createMockStorage(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size
    },
  }
}

// Mock kernel
function createMockKernel(): Kernel {
  return {
    getScrollPosition: vi.fn(() => ({ scrollTop: 500, scrollLeft: 0 })),
    scrollTo: vi.fn(),
    getPlugin: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 5000),
    getViewport: vi.fn(() => ({ top: 0, left: 0, width: 300, height: 400, bottom: 400, right: 300 })),
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
    getPlugins: vi.fn(() => []),
    hasPlugin: vi.fn(),
    setScrollPosition: vi.fn(),
    getItemOffset: vi.fn((index: number) => index * 50),
    getOptions: vi.fn(() => ({ overscan: 2 })),
    getItemCount: vi.fn(() => 100),
  } as unknown as Kernel
}

describe('scrollRestoration', () => {
  let kernel: Kernel
  let mockStorage: Storage

  beforeEach(() => {
    vi.useFakeTimers()
    kernel = createMockKernel()
    mockStorage = createMockStorage()

    // Mock sessionStorage/localStorage
    vi.stubGlobal('sessionStorage', mockStorage)
    vi.stubGlobal('localStorage', mockStorage)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('installation', () => {
    it('should install with default options', () => {
      const plugin = scrollRestoration({ key: 'test-list' })

      expect(plugin.name).toBe('scroll-restoration')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should restore position on mount by default', async () => {
      // Save a position first
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 200,
        scrollLeft: 0,
        timestamp: Date.now(),
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: true,
      })

      plugin.install?.(kernel)

      // Wait for RAF
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledWith(200)
    })

    it('should not restore on mount if disabled', async () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 200,
        scrollLeft: 0,
        timestamp: Date.now(),
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).not.toHaveBeenCalled()
    })

    it('should save position on unmount by default', async () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        saveOnUnmount: true,
      })

      plugin.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16) // let the mount restore run first
      plugin.uninstall?.()

      expect(mockStorage.setItem).toHaveBeenCalled()
    })

    it('should keep the saved position when uninstalled before the restore ran', async () => {
      const saved = JSON.stringify({ scrollTop: 200, scrollLeft: 0, timestamp: Date.now() })
      mockStorage.setItem('scrollex:test-list', saved)
      vi.mocked(mockStorage.setItem).mockClear()

      const plugin = scrollRestoration({ key: 'test-list' })
      plugin.install?.(kernel)
      plugin.uninstall?.()
      await vi.advanceTimersByTimeAsync(16)

      expect(mockStorage.setItem).not.toHaveBeenCalled()
      expect(mockStorage.getItem('scrollex:test-list')).toBe(saved)
      expect(kernel.scrollTo).not.toHaveBeenCalled()
    })

    it('should restore the saved position after an install, uninstall, install cycle', async () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({ scrollTop: 200, scrollLeft: 0, timestamp: Date.now() }))

      const plugin = scrollRestoration({ key: 'test-list' })
      plugin.install?.(kernel)
      plugin.uninstall?.()
      plugin.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledTimes(1)
      expect(kernel.scrollTo).toHaveBeenCalledWith(200)
    })

    it('should restore only once per kernel when the plugin is re-registered', async () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({ scrollTop: 200, scrollLeft: 0, timestamp: Date.now() }))

      const first = scrollRestoration({ key: 'test-list', saveOnUnmount: false })
      first.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)
      first.uninstall?.()

      const second = scrollRestoration({ key: 'test-list', saveOnUnmount: false })
      second.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledTimes(1)
    })

    it('should restore scrollLeft for a horizontal kernel', async () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({ scrollTop: 0, scrollLeft: 300, timestamp: Date.now() }))
      vi.mocked(kernel.getOptions).mockReturnValue({ direction: 'horizontal' } as ReturnType<Kernel['getOptions']>)

      const plugin = scrollRestoration({ key: 'test-list' })
      plugin.install?.(kernel)
      await vi.advanceTimersByTimeAsync(16)

      expect(kernel.scrollTo).toHaveBeenCalledWith(300)
    })
  })

  describe('save', () => {
    it('should save current scroll position', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.save()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'scrollex:test-list',
        expect.any(String)
      )

      const saved = JSON.parse(mockStorage.getItem('scrollex:test-list')!)
      expect(saved.scrollTop).toBe(500)
    })

    it('should include focused index if requested', () => {
      const keyboardNavPlugin = {
        api: {
          getFocusedIndex: vi.fn(() => 25),
        },
      }
      ;(kernel.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(keyboardNavPlugin)

      const plugin = scrollRestoration({
        key: 'test-list',
        includeIndex: true,
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.save()

      const saved = JSON.parse(mockStorage.getItem('scrollex:test-list')!)
      expect(saved.focusedIndex).toBe(25)
    })

    it('should use localStorage when specified', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        storage: 'localStorage',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.save()

      expect(mockStorage.setItem).toHaveBeenCalled()
    })

    it('should use custom storage', () => {
      const customStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      }

      const plugin = scrollRestoration({
        key: 'test-list',
        storage: customStorage,
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.save()

      expect(customStorage.setItem).toHaveBeenCalled()
    })

    it('should handle storage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(mockStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage full')
      })

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      expect(() => plugin.api?.save()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Scrollex] Failed to save scroll position:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('restore', () => {
    it('should restore saved position', () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 300,
        scrollLeft: 0,
        timestamp: Date.now(),
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const result = plugin.api?.restore()

      expect(result).toBe(true)
      expect(kernel.scrollTo).toHaveBeenCalledWith(300)
    })

    it('should return false if no saved position', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const result = plugin.api?.restore()

      expect(result).toBe(false)
    })

    it('should restore focused index if available', () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 300,
        scrollLeft: 0,
        focusedIndex: 15,
        timestamp: Date.now(),
      }))

      const keyboardNavPlugin = {
        api: {
          setFocusedIndex: vi.fn(),
        },
      }
      ;(kernel.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(keyboardNavPlugin)

      const plugin = scrollRestoration({
        key: 'test-list',
        includeIndex: true,
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.restore()

      expect(keyboardNavPlugin.api.setFocusedIndex).toHaveBeenCalledWith(15)
    })

    it('should not restore expired state', () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 300,
        scrollLeft: 0,
        timestamp: Date.now() - 10000, // 10 seconds ago
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        maxAge: 5000, // 5 seconds
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const result = plugin.api?.restore()

      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear saved position', () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 300,
        scrollLeft: 0,
        timestamp: Date.now(),
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      plugin.api?.clear()

      expect(mockStorage.removeItem).toHaveBeenCalledWith('scrollex:test-list')
    })

    it('should handle storage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(mockStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage error')
      })

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      expect(() => plugin.api?.clear()).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('getSavedPosition', () => {
    it('should return saved position', () => {
      const savedState = {
        scrollTop: 300,
        scrollLeft: 0,
        timestamp: Date.now(),
      }
      mockStorage.setItem('scrollex:test-list', JSON.stringify(savedState))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const position = plugin.api?.getSavedPosition()

      expect(position?.scrollTop).toBe(300)
    })

    it('should return null if no saved position', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const position = plugin.api?.getSavedPosition()

      expect(position).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      mockStorage.setItem('scrollex:test-list', 'invalid json')

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)
      const position = plugin.api?.getSavedPosition()

      expect(position).toBeNull()
    })
  })

  describe('hasSavedPosition', () => {
    it('should return true if position is saved', () => {
      mockStorage.setItem('scrollex:test-list', JSON.stringify({
        scrollTop: 300,
        scrollLeft: 0,
        timestamp: Date.now(),
      }))

      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.hasSavedPosition()).toBe(true)
    })

    it('should return false if no position saved', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.hasSavedPosition()).toBe(false)
    })
  })

  describe('saveOnScroll', () => {
    it('should save on scroll when enabled', async () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        saveOnScroll: true,
        debounceMs: 100,
        restoreOnMount: false,
      })

      plugin.install?.(kernel)

      // Trigger scroll
      const scrollEvent: ScrollEvent = {
        type: 'scroll',
        scrollTop: 1000,
        scrollLeft: 0,
        deltaY: 0,
        deltaX: 0,
        direction: 'down',
        timestamp: Date.now(),
      }

      plugin.hooks?.onScroll?.(scrollEvent)

      await vi.advanceTimersByTimeAsync(150)

      expect(mockStorage.setItem).toHaveBeenCalled()
    })
  })
})

describe('scrollRestoration key change on the same kernel', () => {
  it('should restore the position of a new key but not repeat a restore for the same key', () => {
    vi.useFakeTimers()
    const storage = createMockStorage()
    vi.stubGlobal('sessionStorage', storage)
    storage.setItem('scrollex:A', JSON.stringify({ scrollTop: 120, scrollLeft: 0, timestamp: Date.now() }))
    storage.setItem('scrollex:B', JSON.stringify({ scrollTop: 300, scrollLeft: 0, timestamp: Date.now() }))
    const kernel = createMockKernel()
    const restored = () => (kernel.scrollTo as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])

    const a = scrollRestoration({ key: 'A' })
    a.install(kernel)
    vi.advanceTimersByTime(50)
    a.uninstall()
    const a2 = scrollRestoration({ key: 'A' })
    a2.install(kernel)
    vi.advanceTimersByTime(50)
    expect(restored()).toEqual([120])

    a2.uninstall()
    const b = scrollRestoration({ key: 'B' })
    b.install(kernel)
    vi.advanceTimersByTime(50)
    expect(restored()).toEqual([120, 300])
    b.uninstall()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
})

describe('scrollRestoration when the data arrives after mount', () => {
  let frames: FrameRequestCallback[] = []
  const realRaf = globalThis.requestAnimationFrame
  const realCancel = globalThis.cancelAnimationFrame
  beforeEach(() => {
    frames = []
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { frames.push(cb); return frames.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { frames[id - 1] = (() => {}) as FrameRequestCallback }) as typeof cancelAnimationFrame
  })
  afterEach(() => { globalThis.requestAnimationFrame = realRaf; globalThis.cancelAnimationFrame = realCancel })
  const flush = () => { const f = frames.splice(0); f.forEach((cb) => cb(0)) }

  function scenario(itemsAtMount: number) {
    const store = new Map<string, string>([['scrollex:k', JSON.stringify({ scrollTop: 1000, scrollLeft: 0, timestamp: Date.now() })]])
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    let top = 0
    const kernel = createKernel({ itemCount: itemsAtMount, estimatedItemHeight: 50, overscan: 0 })
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { get: () => top, set: (v: number) => { top = Math.max(0, Math.min(v, Math.max(0, kernel.getTotalSize() - 400))) }, configurable: true })
    Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    kernel.attach(el)
    const plugin = scrollRestoration({ key: 'k', storage })
    kernel.register(plugin)
    flush() // the restore frame
    kernel.configure({ itemCount: 200 }) // the data arrives
    flush()
    const afterData = top
    kernel.unregister('scroll-restoration') // unmount
    const saved = (JSON.parse(store.get('scrollex:k')!) as { scrollTop: number }).scrollTop
    kernel.destroy()
    return { afterData, saved }
  }

  it('should restore once the list is long enough and keep the saved position until then', () => {
    const control = scenario(200)
    expect(control).toEqual({ afterData: 1000, saved: 1000 }) // content already there

    const late = scenario(0)
    expect(late).toEqual({ afterData: 1000, saved: 1000 })
  })

  it('should not overwrite the saved position when the list is unmounted before its data arrived', () => {
    const store = new Map<string, string>([['scrollex:k', JSON.stringify({ scrollTop: 1000, scrollLeft: 0, timestamp: Date.now() })]])
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    const kernel = createKernel({ itemCount: 0, estimatedItemHeight: 50, overscan: 0 })
    const el = document.createElement('div')
    Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { get: () => 300, configurable: true })
    kernel.attach(el)
    kernel.register(scrollRestoration({ key: 'k', storage }))
    flush()
    kernel.unregister('scroll-restoration')
    expect(JSON.parse(store.get('scrollex:k')!).scrollTop).toBe(1000)
    kernel.destroy()
  })
})
