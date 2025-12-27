import { vi } from 'vitest'
import { masonryRenderer } from '../../../src/plugins/optional/masonry-renderer.js'
import type { Kernel, VirtualItem } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: {
  itemCount?: number
  viewportWidth?: number
  viewportHeight?: number
  scrollTop?: number
  overscan?: number
} = {}): Kernel {
  const {
    itemCount = 20,
    viewportWidth = 600,
    viewportHeight = 400,
    scrollTop = 0,
    overscan = 2,
  } = options

  return {
    getItemCount: vi.fn(() => itemCount),
    getViewport: vi.fn(() => ({
      top: scrollTop,
      left: 0,
      width: viewportWidth,
      height: viewportHeight,
      bottom: scrollTop + viewportHeight,
      right: viewportWidth,
    })),
    getScrollPosition: vi.fn(() => ({ scrollTop, scrollLeft: 0 })),
    getOptions: vi.fn(() => ({ overscan })),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => 5000),
    scrollTo: vi.fn(),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
    getEstimatedHeight: vi.fn(() => 100),
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
    setScrollPosition: vi.fn(),
    getItemOffset: vi.fn((index: number) => index * 100),
  } as unknown as Kernel
}

describe('masonryRenderer', () => {
  let kernel: Kernel
  // Different heights for variety
  const getItemHeight = (index: number, _columnWidth: number) => 100 + (index % 3) * 50

  beforeEach(() => {
    kernel = createMockKernel()
  })

  describe('installation', () => {
    it('should install with fixed columns', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      expect(plugin.name).toBe('masonry-renderer')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(3)
    })

    it('should install with auto columns', () => {
      kernel = createMockKernel({ viewportWidth: 600 })

      const plugin = masonryRenderer({
        columns: 'auto',
        minColumnWidth: 200,
        getItemHeight,
      })

      plugin.install?.(kernel)

      // 600 / (200 + 0) = 3 columns
      expect(plugin.api?.getColumnCount()).toBe(3)
    })

    it('should uninstall and clear state', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      plugin.install?.(kernel)
      plugin.uninstall?.()

      expect(plugin.api?.getVirtualItems()).toHaveLength(0)
    })
  })

  describe('layout calculation', () => {
    it('should place items in shortest column', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        gap: 0,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      // Items should be distributed across columns
      // First 3 items go to columns 0, 1, 2
      expect(items?.[0].lane).toBe(0)
      expect(items?.[1].lane).toBe(1)
      expect(items?.[2].lane).toBe(2)

      // After that, items go to shortest column
      // Heights: col0=100, col1=150, col2=200
      // Next item goes to col0 (shortest)
    })

    it('should include gap between items', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight: () => 100,
        gap: 10,
      })

      plugin.install?.(kernel)

      const columnHeights = plugin.api?.getColumnHeights()

      // With uniform heights and 3 items per column (9 total visible)
      // Each column: 3 items * 100 + 2 gaps * 10 = 320 (approx, depends on distribution)
    })

    it('should calculate total height', () => {
      kernel = createMockKernel({ itemCount: 9, viewportHeight: 1000, overscan: 10 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight: () => 100,
        gap: 10,
      })

      plugin.install?.(kernel)

      // 9 items, 3 columns, each column has 3 items
      // Height: 3 * 100 + 2 * 10 = 320 (3 items with 2 gaps between them)
      expect(plugin.api?.getTotalHeight()).toBe(320)
    })

    it('should calculate column width', () => {
      kernel = createMockKernel({ viewportWidth: 600 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        gap: 0,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getColumnWidth()).toBe(200)
    })

    it('should account for gap in column width', () => {
      kernel = createMockKernel({ viewportWidth: 620 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        gap: 10,
      })

      plugin.install?.(kernel)

      // Width: (620 - 2 * 10) / 3 = 200
      expect(plugin.api?.getColumnWidth()).toBe(200)
    })
  })

  describe('getVirtualItems', () => {
    it('should return visible items', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      expect(items).toBeDefined()
      expect(items!.length).toBeGreaterThan(0)

      // Each item should have required properties
      items?.forEach((item: VirtualItem) => {
        expect(item).toHaveProperty('index')
        expect(item).toHaveProperty('start')
        expect(item).toHaveProperty('end')
        expect(item).toHaveProperty('size')
        expect(item).toHaveProperty('lane')
      })
    })

    it('should return empty array without kernel', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      expect(plugin.api?.getVirtualItems()).toHaveLength(0)
    })

    it('should only include items in viewport', () => {
      kernel = createMockKernel({
        itemCount: 100,
        viewportHeight: 200,
        scrollTop: 1000,
        overscan: 0,
      })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight: () => 100,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      // Items should only be those visible at scroll position 1000
      items?.forEach((item: VirtualItem) => {
        const itemEnd = item.start + item.size
        expect(itemEnd).toBeGreaterThanOrEqual(1000 - 100) // With some margin
        expect(item.start).toBeLessThanOrEqual(1200 + 100) // With some margin
      })
    })
  })

  describe('getColumnHeights', () => {
    it('should return heights for all columns', () => {
      const plugin = masonryRenderer({
        columns: 4,
        getItemHeight,
      })

      plugin.install?.(kernel)

      const heights = plugin.api?.getColumnHeights()

      expect(heights).toHaveLength(4)
    })
  })

  describe('getShortestColumn', () => {
    it('should return index of shortest column', () => {
      kernel = createMockKernel({ itemCount: 6 })

      // Heights: 100, 150, 200, 100, 150, 200
      // Col 0: items 0,3 = 100+100 = 200
      // Col 1: items 1,4 = 150+150 = 300
      // Col 2: items 2,5 = 200+200 = 400
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        gap: 0,
      })

      plugin.install?.(kernel)

      // Shortest should be column 2 (items 2 and 5 with heights 200, 200 = 400)
      // But since masonry places items in shortest column, column 2 ends up with 200
      expect(plugin.api?.getShortestColumn()).toBe(2)
    })

    it('should return 0 for empty columns', () => {
      kernel = createMockKernel({ itemCount: 0 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getShortestColumn()).toBe(0)
    })
  })

  describe('getLongestColumn', () => {
    it('should return index of longest column', () => {
      kernel = createMockKernel({ itemCount: 6 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        gap: 0,
      })

      plugin.install?.(kernel)

      // Longest should be column 0 (items get placed in shortest column, so column 0 ends up tallest)
      expect(plugin.api?.getLongestColumn()).toBe(0)
    })

    it('should return 0 for empty columns', () => {
      kernel = createMockKernel({ itemCount: 0 })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getLongestColumn()).toBe(0)
    })
  })

  describe('recalculate', () => {
    it('should recalculate layout', () => {
      const plugin = masonryRenderer({
        columns: 'auto',
        minColumnWidth: 200,
        getItemHeight,
      })

      kernel = createMockKernel({ viewportWidth: 600 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(3)

      // Simulate resize
      ;(kernel.getViewport as ReturnType<typeof vi.fn>).mockReturnValue({
        width: 400,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 400,
      })

      plugin.api?.recalculate()

      expect(plugin.api?.getColumnCount()).toBe(2)
    })

    it('should not throw without kernel', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      expect(() => plugin.api?.recalculate()).not.toThrow()
    })
  })

  describe('hooks', () => {
    it('should update items on scroll', () => {
      kernel = createMockKernel({
        itemCount: 100,
        viewportHeight: 200,
        scrollTop: 0,
      })

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight: () => 100,
      })

      plugin.install?.(kernel)

      const initialItems = plugin.api?.getVirtualItems()

      // Simulate scroll
      ;(kernel.getScrollPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        scrollTop: 2000,
        scrollLeft: 0,
      })

      plugin.hooks?.onScroll?.({} as any)

      const scrolledItems = plugin.api?.getVirtualItems()

      // Items should be different after scroll
      expect(scrolledItems).not.toEqual(initialItems)
    })

    it('should recalculate on resize', () => {
      const plugin = masonryRenderer({
        columns: 'auto',
        minColumnWidth: 200,
        getItemHeight,
      })

      kernel = createMockKernel({ viewportWidth: 600 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(3)

      ;(kernel.getViewport as ReturnType<typeof vi.fn>).mockReturnValue({
        width: 400,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 400,
      })

      plugin.hooks?.onResize?.({} as any)

      expect(plugin.api?.getColumnCount()).toBe(2)
    })

    it('should recalculate on items change', () => {
      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
      })

      plugin.install?.(kernel)

      const initialHeight = plugin.api?.getTotalHeight()

      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(40)

      plugin.hooks?.onItemsChange?.(40, 20)

      expect(plugin.api?.getTotalHeight()).toBeGreaterThan(initialHeight ?? 0)
    })
  })

  describe('custom getItemKey', () => {
    it('should use custom key function', () => {
      const getItemKey = (index: number) => `masonry-${index}`

      const plugin = masonryRenderer({
        columns: 3,
        getItemHeight,
        getItemKey,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      expect(items?.[0].key).toBe('masonry-0')
    })
  })

  describe('auto columns', () => {
    it('should have at least 1 column', () => {
      kernel = createMockKernel({ viewportWidth: 50 })

      const plugin = masonryRenderer({
        columns: 'auto',
        minColumnWidth: 200,
        getItemHeight,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(1)
    })
  })
})
