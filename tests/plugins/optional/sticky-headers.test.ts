import { vi } from 'vitest'
import { stickyHeaders } from '../../../src/plugins/optional/sticky-headers.js'
import type { Kernel, ScrollEvent } from '../../../src/types.js'

// Sample data structure for testing
const testItems = [
  { type: 'header', groupId: 'A' },
  { type: 'item', groupId: 'A' },
  { type: 'item', groupId: 'A' },
  { type: 'header', groupId: 'B' },
  { type: 'item', groupId: 'B' },
  { type: 'item', groupId: 'B' },
  { type: 'header', groupId: 'C' },
  { type: 'item', groupId: 'C' },
]

// Mock kernel
function createMockKernel(items = testItems): Kernel {
  return {
    getItemCount: vi.fn(() => items.length),
    getItemOffset: vi.fn((index: number) => index * 50),
    scrollToIndex: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    getVisibleRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getRenderRange: vi.fn(() => ({ startIndex: 0, endIndex: 10, overscanStartIndex: 0, overscanEndIndex: 10 })),
    getTotalSize: vi.fn(() => items.length * 50),
    getViewport: vi.fn(() => ({ top: 0, left: 0, width: 300, height: 400, bottom: 400, right: 300 })),
    scrollTo: vi.fn(),
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
    setScrollPosition: vi.fn(),
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
    direction: 'down',
    timestamp: Date.now(),
  }
}

describe('stickyHeaders', () => {
  let kernel: Kernel
  const isHeader = (index: number) => testItems[index]?.type === 'header'
  const getGroupId = (index: number) => testItems[index]?.groupId ?? ''

  beforeEach(() => {
    kernel = createMockKernel()
  })

  describe('installation', () => {
    it('should install with required options', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      expect(plugin.name).toBe('sticky-headers')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should build header cache on install', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getHeaderIndices()).toEqual([0, 3, 6])
    })

    it('should uninstall and clear state', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)
      plugin.uninstall?.()

      expect(plugin.api?.getHeaderIndices()).toEqual([])
      expect(plugin.api?.getCurrentStickyHeader()).toBeNull()
    })
  })

  describe('getCurrentStickyHeader', () => {
    it('should return null initially', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getCurrentStickyHeader()).toBeNull()
    })

    it('should update on scroll', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      // Scroll past first header (at offset 0)
      plugin.hooks?.onScroll?.(createScrollEvent(25))

      expect(plugin.api?.getCurrentStickyHeader()).toBe(0)
    })

    it('should return correct header when scrolling', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      // Scroll past second header (at offset 150 = index 3 * 50)
      plugin.hooks?.onScroll?.(createScrollEvent(160))

      expect(plugin.api?.getCurrentStickyHeader()).toBe(3)
    })

    it('should respect stickyOffset', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
        stickyOffset: 20,
      })

      plugin.install?.(kernel)

      // Scroll position is 130, but with offset 20, effective position is 150
      // This should pick up header at index 3 (offset 150)
      plugin.hooks?.onScroll?.(createScrollEvent(130))

      expect(plugin.api?.getCurrentStickyHeader()).toBe(3)
    })
  })

  describe('getGroupForIndex', () => {
    it('should return group ID for an index', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getGroupForIndex(0)).toBe('A')
      expect(plugin.api?.getGroupForIndex(1)).toBe('A')
      expect(plugin.api?.getGroupForIndex(3)).toBe('B')
      expect(plugin.api?.getGroupForIndex(6)).toBe('C')
    })
  })

  describe('scrollToGroup', () => {
    it('should scroll to group header', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      plugin.api?.scrollToGroup('B')

      expect(kernel.scrollToIndex).toHaveBeenCalledWith(3, { align: 'start' })
    })

    it('should not scroll for non-existent group', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      plugin.api?.scrollToGroup('Z')

      expect(kernel.scrollToIndex).not.toHaveBeenCalled()
    })

    it('should not scroll without kernel', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      // Not installed
      expect(() => plugin.api?.scrollToGroup('A')).not.toThrow()
    })
  })

  describe('getHeaderIndices', () => {
    it('should return all header indices', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getHeaderIndices()).toEqual([0, 3, 6])
    })
  })

  describe('getGroupIds', () => {
    it('should return all group IDs', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getGroupIds()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('isHeader', () => {
    it('should check if index is a header', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.isHeader(0)).toBe(true)
      expect(plugin.api?.isHeader(1)).toBe(false)
      expect(plugin.api?.isHeader(3)).toBe(true)
    })
  })

  describe('header height', () => {
    it('should support function for header height', () => {
      const getHeaderHeight = vi.fn((groupId: string) => {
        return groupId === 'A' ? 40 : 60
      })

      const plugin = stickyHeaders({
        headerHeight: getHeaderHeight,
        isHeader,
        getGroupId,
      })

      plugin.install?.(kernel)

      // The function is stored but tested through internal usage
      // Just verify it doesn't break
      expect(plugin.api?.getHeaderIndices()).toEqual([0, 3, 6])
    })
  })

  describe('hooks', () => {
    it('should rebuild cache on items change', () => {
      // Use mutable items array
      let items = [...testItems]
      const dynamicIsHeader = (index: number) => items[index]?.type === 'header'
      const dynamicGetGroupId = (index: number) => items[index]?.groupId ?? ''

      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader: dynamicIsHeader,
        getGroupId: dynamicGetGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getHeaderIndices()).toEqual([0, 3, 6])

      // Simulate items change - add more items
      items = [
        ...testItems,
        { type: 'header', groupId: 'D' },
        { type: 'item', groupId: 'D' },
      ]
      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(items.length)

      plugin.hooks?.onItemsChange?.(items.length, testItems.length)

      expect(plugin.api?.getHeaderIndices()).toEqual([0, 3, 6, 8])
    })
  })

  describe('edge cases', () => {
    it('should handle empty item list', () => {
      kernel = createMockKernel([])
      ;(kernel.getItemCount as ReturnType<typeof vi.fn>).mockReturnValue(0)

      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader: () => false,
        getGroupId: () => '',
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getHeaderIndices()).toEqual([])
      expect(plugin.api?.getCurrentStickyHeader()).toBeNull()

      plugin.hooks?.onScroll?.(createScrollEvent(100))

      expect(plugin.api?.getCurrentStickyHeader()).toBeNull()
    })

    it('should handle no headers', () => {
      const plugin = stickyHeaders({
        headerHeight: 40,
        isHeader: () => false,
        getGroupId,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.getHeaderIndices()).toEqual([])
    })
  })
})
