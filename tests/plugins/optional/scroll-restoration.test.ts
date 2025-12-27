import { vi } from 'vitest'
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

    it('should save position on unmount by default', () => {
      const plugin = scrollRestoration({
        key: 'test-list',
        saveOnUnmount: true,
      })

      plugin.install?.(kernel)
      plugin.uninstall?.()

      expect(mockStorage.setItem).toHaveBeenCalled()
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
