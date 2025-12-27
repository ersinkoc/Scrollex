import { vi } from 'vitest'
import { gridRendererPlugin } from '../../../src/plugins/core/grid-renderer.js'
import type { Kernel } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: {
  itemCount?: number
  viewportWidth?: number
  viewportHeight?: number
  scrollTop?: number
  overscan?: number
} = {}): Kernel {
  const {
    itemCount = 100,
    viewportWidth = 400,
    viewportHeight = 600,
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

describe('gridRendererPlugin', () => {
  describe('installation', () => {
    it('should install with fixed columns', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      expect(plugin.name).toBe('grid-renderer')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('core')

      const kernel = createMockKernel({ viewportWidth: 400 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(3)
    })

    it('should install with auto columns', () => {
      const plugin = gridRendererPlugin({
        columns: 'auto',
        minColumnWidth: 100,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 450 })
      plugin.install?.(kernel)

      // 450 / (100 + 0) = 4 columns
      expect(plugin.api?.getColumnCount()).toBe(4)
    })

    it('should uninstall and clear items', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel()
      plugin.install?.(kernel)
      plugin.uninstall?.()

      expect(plugin.api?.getVirtualItems()).toHaveLength(0)
    })
  })

  describe('getVirtualItems', () => {
    it('should return virtual items for visible rows', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({
        itemCount: 30,
        viewportHeight: 300,
        scrollTop: 0,
        overscan: 1,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      expect(items).toBeDefined()
      expect(items!.length).toBeGreaterThan(0)

      // Check first item
      expect(items![0].index).toBe(0)
      expect(items![0].start).toBe(0)
      expect(items![0].size).toBe(100)
      expect(items![0].lane).toBe(0)
    })

    it('should include lane (column) information', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({
        itemCount: 10,
        viewportHeight: 500,
        scrollTop: 0,
        overscan: 0,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      // First row items should have lanes 0, 1, 2
      expect(items![0].lane).toBe(0)
      expect(items![1].lane).toBe(1)
      expect(items![2].lane).toBe(2)

      // Second row items should also have lanes 0, 1, 2
      expect(items![3].lane).toBe(0)
      expect(items![4].lane).toBe(1)
      expect(items![5].lane).toBe(2)
    })

    it('should handle gap between items', () => {
      const plugin = gridRendererPlugin({
        columns: 2,
        rowHeight: 100,
        gap: 10,
      })

      const kernel = createMockKernel({
        itemCount: 10,
        viewportWidth: 210,
        viewportHeight: 500,
        scrollTop: 0,
        overscan: 0,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      // First row at y=0, second row at y=110 (100 + 10 gap)
      expect(items![0].start).toBe(0)
      expect(items![2].start).toBe(110)
    })

    it('should handle separate x and y gaps', () => {
      const plugin = gridRendererPlugin({
        columns: 2,
        rowHeight: 100,
        gap: { x: 20, y: 10 },
      })

      const kernel = createMockKernel({
        itemCount: 10,
        viewportWidth: 220,
        viewportHeight: 500,
        scrollTop: 0,
        overscan: 0,
      })

      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      // Row gap is 10
      expect(items![0].start).toBe(0)
      expect(items![2].start).toBe(110) // 100 + 10
    })

    it('should return empty array without kernel', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      expect(plugin.api?.getVirtualItems()).toHaveLength(0)
    })
  })

  describe('getTotalHeight', () => {
    it('should calculate total height', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ itemCount: 12 })
      plugin.install?.(kernel)

      // 12 items / 3 columns = 4 rows
      // 4 rows * 100 height = 400
      expect(plugin.api?.getTotalHeight()).toBe(400)
    })

    it('should include gap in total height', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
        gap: 10,
      })

      const kernel = createMockKernel({ itemCount: 12 })
      plugin.install?.(kernel)

      // 4 rows * (100 + 10) - 10 = 430
      expect(plugin.api?.getTotalHeight()).toBe(430)
    })

    it('should handle partial last row', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ itemCount: 10 })
      plugin.install?.(kernel)

      // 10 items / 3 columns = 4 rows (ceil)
      expect(plugin.api?.getTotalHeight()).toBe(400)
    })
  })

  describe('getColumnCount', () => {
    it('should return fixed column count', () => {
      const plugin = gridRendererPlugin({
        columns: 5,
        rowHeight: 100,
      })

      const kernel = createMockKernel()
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(5)
    })

    it('should calculate auto column count', () => {
      const plugin = gridRendererPlugin({
        columns: 'auto',
        minColumnWidth: 100,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 350 })
      plugin.install?.(kernel)

      // 350 / 100 = 3 columns
      expect(plugin.api?.getColumnCount()).toBe(3)
    })

    it('should have at least 1 column', () => {
      const plugin = gridRendererPlugin({
        columns: 'auto',
        minColumnWidth: 500,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 100 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(1)
    })
  })

  describe('getColumnWidth', () => {
    it('should calculate column width', () => {
      const plugin = gridRendererPlugin({
        columns: 4,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 400 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnWidth()).toBe(100)
    })

    it('should account for gaps', () => {
      const plugin = gridRendererPlugin({
        columns: 4,
        rowHeight: 100,
        gap: 20,
      })

      // Container: 400, 4 columns, 3 gaps of 20 = 60
      // Column width: (400 - 60) / 4 = 85
      const kernel = createMockKernel({ viewportWidth: 400 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnWidth()).toBe(85)
    })
  })

  describe('getItemsPerRow', () => {
    it('should return column count as items per row', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel()
      plugin.install?.(kernel)

      expect(plugin.api?.getItemsPerRow()).toBe(3)
    })
  })

  describe('getRowCount', () => {
    it('should return row count', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ itemCount: 10 })
      plugin.install?.(kernel)

      // ceil(10 / 3) = 4 rows
      expect(plugin.api?.getRowCount()).toBe(4)
    })

    it('should return 0 without kernel', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      expect(plugin.api?.getRowCount()).toBe(0)
    })
  })

  describe('recalculate', () => {
    it('should recalculate grid layout', () => {
      const plugin = gridRendererPlugin({
        columns: 'auto',
        minColumnWidth: 100,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 400 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(4)

      // Simulate viewport resize
      ;(kernel.getViewport as ReturnType<typeof vi.fn>).mockReturnValue({
        width: 200,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 200,
      })

      plugin.api?.recalculate()

      expect(plugin.api?.getColumnCount()).toBe(2)
    })

    it('should not throw without kernel', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      expect(() => plugin.api?.recalculate()).not.toThrow()
    })
  })

  describe('hooks', () => {
    it('should update virtual items on scroll', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({
        itemCount: 100,
        viewportHeight: 300,
        scrollTop: 0,
      })

      plugin.install?.(kernel)

      const initialItems = plugin.api?.getVirtualItems()

      // Simulate scroll
      ;(kernel.getScrollPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        scrollTop: 500,
        scrollLeft: 0,
      })

      plugin.hooks?.onScroll?.({} as any)

      const scrolledItems = plugin.api?.getVirtualItems()

      // Items should be different after scroll
      expect(scrolledItems![0].index).not.toBe(initialItems![0].index)
    })

    it('should recalculate on resize', () => {
      const plugin = gridRendererPlugin({
        columns: 'auto',
        minColumnWidth: 100,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ viewportWidth: 400 })
      plugin.install?.(kernel)

      expect(plugin.api?.getColumnCount()).toBe(4)

      ;(kernel.getViewport as ReturnType<typeof vi.fn>).mockReturnValue({
        width: 200,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 200,
      })

      plugin.hooks?.onResize?.({} as any)

      expect(plugin.api?.getColumnCount()).toBe(2)
    })

    it('should recalculate on items change', () => {
      const plugin = gridRendererPlugin({
        columns: 3,
        rowHeight: 100,
      })

      const kernel = createMockKernel({ itemCount: 10 })
      plugin.install?.(kernel)

      expect(plugin.api?.getRowCount()).toBe(4)

      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(20)

      plugin.hooks?.onItemsChange?.(20, 10)

      expect(plugin.api?.getRowCount()).toBe(7)
    })
  })

  describe('custom getItemKey', () => {
    it('should use custom key function', () => {
      const getItemKey = (index: number) => `item-${index}`

      const plugin = gridRendererPlugin({
        columns: 2,
        rowHeight: 100,
        getItemKey,
      })

      const kernel = createMockKernel({ itemCount: 10 })
      plugin.install?.(kernel)

      const items = plugin.api?.getVirtualItems()

      expect(items![0].key).toBe('item-0')
      expect(items![1].key).toBe('item-1')
    })
  })
})
