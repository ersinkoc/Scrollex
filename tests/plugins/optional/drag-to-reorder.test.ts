import { vi } from 'vitest'
import { dragToReorder } from '../../../src/plugins/optional/drag-to-reorder.js'
import type { Kernel } from '../../../src/types.js'

// Mock kernel
function createMockKernel(options: { itemCount?: number } = {}): Kernel {
  const { itemCount = 10 } = options

  return {
    getItemCount: vi.fn(() => itemCount),
    getScrollPosition: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0 })),
    scrollTo: vi.fn(),
    configure: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    destroy: vi.fn(),
    getVisibleRange: vi.fn(() => ({
      startIndex: 0,
      endIndex: 10,
      overscanStartIndex: 0,
      overscanEndIndex: 10,
    })),
    getRenderRange: vi.fn(() => ({
      startIndex: 0,
      endIndex: 10,
      overscanStartIndex: 0,
      overscanEndIndex: 10,
    })),
    getTotalSize: vi.fn(() => 500),
    getViewport: vi.fn(() => ({
      top: 0,
      left: 0,
      width: 300,
      height: 400,
      bottom: 400,
      right: 300,
    })),
    scrollToIndex: vi.fn(),
    measureItem: vi.fn(),
    getCachedHeight: vi.fn(),
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
    getItemOffset: vi.fn((index: number) => index * 50),
    getOptions: vi.fn(() => ({ overscan: 2 })),
  } as unknown as Kernel
}

function createDragEvent(type: string, options: {
  clientX?: number
  clientY?: number
  dataTransfer?: Partial<DataTransfer>
  currentTarget?: Partial<HTMLElement>
} = {}): DragEvent {
  const { clientX = 0, clientY = 0, dataTransfer, currentTarget } = options

  return {
    type,
    clientX,
    clientY,
    dataTransfer: dataTransfer ?? {
      setData: vi.fn(),
      getData: vi.fn(() => ''),
      effectAllowed: 'uninitialized' as DataTransferEffectAllowed,
      dropEffect: 'none' as DataTransferDropEffect,
    },
    currentTarget: currentTarget ?? {
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as DragEvent
}

describe('dragToReorder', () => {
  let kernel: Kernel
  let onReorder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    kernel = createMockKernel()
    onReorder = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('installation', () => {
    it('should install with required options', () => {
      const plugin = dragToReorder({ onReorder })

      expect(plugin.name).toBe('drag-to-reorder')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.type).toBe('optional')

      plugin.install?.(kernel)

      expect(plugin.api).toBeDefined()
    })

    it('should install with custom options', () => {
      const plugin = dragToReorder({
        enabled: false,
        axis: 'horizontal',
        handle: false,
        autoScroll: false,
        autoScrollSpeed: 20,
        dropIndicator: 'gap',
        onReorder,
      })

      plugin.install?.(kernel)

      expect(plugin.api?.isEnabled()).toBe(false)
    })

    it('should uninstall and clean up', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start a drag
      const props = plugin.api?.getDragHandleProps(0)
      const dragStartEvent = createDragEvent('dragstart')
      props?.onDragStart(dragStartEvent)

      expect(plugin.api?.isDragging()).toBe(true)

      plugin.uninstall?.()

      // Should reset state after uninstall
      expect(plugin.api?.isDragging()).toBe(false)
    })
  })

  describe('drag state', () => {
    it('should track dragging state', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      expect(plugin.api?.isDragging()).toBe(false)
      expect(plugin.api?.getDraggedIndex()).toBeNull()
      expect(plugin.api?.getDropTargetIndex()).toBeNull()

      // Start drag
      const props = plugin.api?.getDragHandleProps(3)
      const dragStartEvent = createDragEvent('dragstart')
      props?.onDragStart(dragStartEvent)

      expect(plugin.api?.isDragging()).toBe(true)
      expect(plugin.api?.getDraggedIndex()).toBe(3)
      expect(plugin.api?.getDropTargetIndex()).toBe(3)
    })

    it('should cancel drag', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(2)
      props?.onDragStart(createDragEvent('dragstart'))

      expect(plugin.api?.isDragging()).toBe(true)

      plugin.api?.cancelDrag()

      expect(plugin.api?.isDragging()).toBe(false)
      expect(plugin.api?.getDraggedIndex()).toBeNull()
      expect(plugin.api?.getDropTargetIndex()).toBeNull()
    })
  })

  describe('enable/disable', () => {
    it('should enable and disable', () => {
      const plugin = dragToReorder({ onReorder, enabled: false })
      plugin.install?.(kernel)

      expect(plugin.api?.isEnabled()).toBe(false)

      plugin.api?.enable()

      expect(plugin.api?.isEnabled()).toBe(true)

      plugin.api?.disable()

      expect(plugin.api?.isEnabled()).toBe(false)
    })

    it('should cancel drag when disabled', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(1)
      props?.onDragStart(createDragEvent('dragstart'))

      expect(plugin.api?.isDragging()).toBe(true)

      plugin.api?.disable()

      expect(plugin.api?.isDragging()).toBe(false)
    })

    it('should prevent drag start when disabled', () => {
      const plugin = dragToReorder({ onReorder, enabled: false })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      const event = createDragEvent('dragstart')
      props?.onDragStart(event)

      expect(plugin.api?.isDragging()).toBe(false)
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe('getDragHandleProps', () => {
    it('should return proper drag handle props', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(5)

      expect(props).toBeDefined()
      expect(props?.draggable).toBe(true)
      expect(props?.['data-drag-index']).toBe('5')
      expect(props?.['aria-grabbed']).toBe(false)
      expect(typeof props?.onDragStart).toBe('function')
      expect(typeof props?.onDragEnd).toBe('function')
      expect(typeof props?.onDragOver).toBe('function')
      expect(typeof props?.onDragEnter).toBe('function')
      expect(typeof props?.onDragLeave).toBe('function')
      expect(typeof props?.onDrop).toBe('function')
    })

    it('should show aria-grabbed when dragging', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start drag on item 3
      const props3 = plugin.api?.getDragHandleProps(3)
      props3?.onDragStart(createDragEvent('dragstart'))

      // Check aria-grabbed
      const propsAfter = plugin.api?.getDragHandleProps(3)
      expect(propsAfter?.['aria-grabbed']).toBe(true)

      const otherProps = plugin.api?.getDragHandleProps(5)
      expect(otherProps?.['aria-grabbed']).toBe(false)
    })

    it('should not be draggable when disabled', () => {
      const plugin = dragToReorder({ onReorder, enabled: false })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)

      expect(props?.draggable).toBe(false)
    })
  })

  describe('canDrag', () => {
    it('should respect canDrag callback', () => {
      const canDrag = vi.fn((index: number) => index !== 0)

      const plugin = dragToReorder({
        onReorder,
        canDrag,
      })
      plugin.install?.(kernel)

      // Item 0 cannot be dragged
      const props0 = plugin.api?.getDragHandleProps(0)
      expect(props0?.draggable).toBe(false)

      const event0 = createDragEvent('dragstart')
      props0?.onDragStart(event0)
      expect(plugin.api?.isDragging()).toBe(false)
      expect(event0.preventDefault).toHaveBeenCalled()

      // Item 1 can be dragged
      const props1 = plugin.api?.getDragHandleProps(1)
      expect(props1?.draggable).toBe(true)

      props1?.onDragStart(createDragEvent('dragstart'))
      expect(plugin.api?.isDragging()).toBe(true)
    })
  })

  describe('canDrop', () => {
    it('should respect canDrop callback', () => {
      const canDrop = vi.fn((from: number, to: number) => to !== 5)

      const plugin = dragToReorder({
        onReorder,
        canDrop,
      })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(2)
      props?.onDragStart(createDragEvent('dragstart'))

      // Drag over allowed target
      const overEvent = createDragEvent('dragover', {
        clientY: 10,
        currentTarget: {
          getBoundingClientRect: () => ({
            top: 0,
            left: 0,
            right: 100,
            bottom: 50,
            width: 100,
            height: 50,
            x: 0,
            y: 0,
            toJSON: () => {},
          }),
        },
      })
      props?.onDragOver(overEvent)

      expect((overEvent.dataTransfer as DataTransfer).dropEffect).toBe('move')

      // Drag over disallowed target (index 5)
      const props5 = plugin.api?.getDragHandleProps(5)
      const overEvent5 = createDragEvent('dragover', {
        clientY: 10,
        currentTarget: {
          getBoundingClientRect: () => ({
            top: 250,
            left: 0,
            right: 100,
            bottom: 300,
            width: 100,
            height: 50,
            x: 0,
            y: 250,
            toJSON: () => {},
          }),
        },
      })

      props5?.onDragOver(overEvent5)

      expect((overEvent5.dataTransfer as DataTransfer).dropEffect).toBe('none')
    })

    it('should not call onReorder when canDrop returns false', () => {
      const canDrop = vi.fn(() => false)

      const plugin = dragToReorder({
        onReorder,
        canDrop,
      })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      // Move to different position
      const props2 = plugin.api?.getDragHandleProps(2)
      props2?.onDragOver(createDragEvent('dragover', { clientY: 75 }))

      // End drag
      props?.onDragEnd(createDragEvent('dragend'))

      expect(onReorder).not.toHaveBeenCalled()
    })
  })

  describe('drag events', () => {
    it('should call onDragStart callback', () => {
      const onDragStart = vi.fn()

      const plugin = dragToReorder({ onReorder, onDragStart })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(3)
      props?.onDragStart(createDragEvent('dragstart'))

      expect(onDragStart).toHaveBeenCalledWith(3)
    })

    it('should call onDragEnd callback', () => {
      const onDragEnd = vi.fn()

      const plugin = dragToReorder({ onReorder, onDragEnd })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(2)
      props?.onDragStart(createDragEvent('dragstart'))
      props?.onDragEnd(createDragEvent('dragend'))

      expect(onDragEnd).toHaveBeenCalledWith(2)
    })

    it('should call onReorder when dropped at different position', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start drag from index 1
      const props1 = plugin.api?.getDragHandleProps(1)
      props1?.onDragStart(createDragEvent('dragstart'))

      // Drag over index 4 (below midpoint)
      const props4 = plugin.api?.getDragHandleProps(4)
      props4?.onDragOver(createDragEvent('dragover', {
        clientY: 225, // Below midpoint of item at y=200-250
        currentTarget: {
          getBoundingClientRect: () => ({
            top: 200,
            left: 0,
            right: 100,
            bottom: 250,
            width: 100,
            height: 50,
            x: 0,
            y: 200,
            toJSON: () => {},
          }),
        },
      }))

      // End drag
      props1?.onDragEnd(createDragEvent('dragend'))

      expect(onReorder).toHaveBeenCalledWith(1, expect.any(Number))
    })

    it('should not call onReorder when dropped at same position', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(2)
      props?.onDragStart(createDragEvent('dragstart'))
      props?.onDragEnd(createDragEvent('dragend'))

      expect(onReorder).not.toHaveBeenCalled()
    })

    it('should handle drag enter', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      const event = createDragEvent('dragenter')
      props?.onDragEnter(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should handle drag leave', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      const event = createDragEvent('dragleave')

      // Should not throw
      expect(() => props?.onDragLeave(event)).not.toThrow()
    })

    it('should handle drop', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      const event = createDragEvent('drop')
      props?.onDrop(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe('axis', () => {
    it('should calculate drop position for vertical axis', () => {
      const plugin = dragToReorder({ onReorder, axis: 'vertical' })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      // Drag over item at index 2 - above midpoint
      const props2 = plugin.api?.getDragHandleProps(2)
      props2?.onDragOver(createDragEvent('dragover', {
        clientY: 110, // Above midpoint (100 + 50/2 = 125)
        currentTarget: {
          getBoundingClientRect: () => ({
            top: 100,
            bottom: 150,
            left: 0,
            right: 100,
            width: 100,
            height: 50,
            x: 0,
            y: 100,
            toJSON: () => {},
          }),
        },
      }))

      expect(plugin.api?.getDropTargetIndex()).toBe(1) // Adjusted for dragged item
    })

    it('should calculate drop position for horizontal axis', () => {
      const plugin = dragToReorder({ onReorder, axis: 'horizontal' })
      plugin.install?.(kernel)

      // Start drag
      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      // Drag over item at index 2 - right of midpoint
      const props2 = plugin.api?.getDragHandleProps(2)
      props2?.onDragOver(createDragEvent('dragover', {
        clientX: 260, // Right of midpoint (200 + 100/2 = 250)
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 200,
            right: 300,
            top: 0,
            bottom: 50,
            width: 100,
            height: 50,
            x: 200,
            y: 0,
            toJSON: () => {},
          }),
        },
      }))

      expect(plugin.api?.getDropTargetIndex()).toBe(2) // Adjusted for dragged item
    })
  })

  describe('auto-scroll', () => {
    it('should start auto-scroll when dragging', () => {
      const plugin = dragToReorder({ onReorder, autoScroll: true })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      // Auto-scroll timer should be running
      vi.advanceTimersByTime(100)

      // End drag
      props?.onDragEnd(createDragEvent('dragend'))
    })

    it('should not start auto-scroll when disabled', () => {
      const plugin = dragToReorder({ onReorder, autoScroll: false })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      // Advance timers - should not cause issues
      vi.advanceTimersByTime(100)

      props?.onDragEnd(createDragEvent('dragend'))
    })

    it('should stop auto-scroll when drag ends', () => {
      const plugin = dragToReorder({ onReorder, autoScroll: true })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))
      props?.onDragEnd(createDragEvent('dragend'))

      // Timer should be cleared, no further updates
    })

    it('should stop auto-scroll when drag cancelled', () => {
      const plugin = dragToReorder({ onReorder, autoScroll: true })
      plugin.install?.(kernel)

      const props = plugin.api?.getDragHandleProps(0)
      props?.onDragStart(createDragEvent('dragstart'))

      plugin.api?.cancelDrag()

      // Timer should be cleared
    })
  })

  describe('dataTransfer', () => {
    it('should set drag data on drag start', () => {
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      const setData = vi.fn()
      const event = createDragEvent('dragstart', {
        dataTransfer: {
          setData,
          effectAllowed: 'uninitialized',
          dropEffect: 'none',
        },
      })

      const props = plugin.api?.getDragHandleProps(5)
      props?.onDragStart(event)

      expect(setData).toHaveBeenCalledWith('text/plain', '5')
      expect((event.dataTransfer as DataTransfer).effectAllowed).toBe('move')
    })
  })

  describe('drop target bounds', () => {
    it('should clamp drop target to valid range', () => {
      kernel = createMockKernel({ itemCount: 5 })
      const plugin = dragToReorder({ onReorder })
      plugin.install?.(kernel)

      // Start drag from index 0
      const props0 = plugin.api?.getDragHandleProps(0)
      props0?.onDragStart(createDragEvent('dragstart'))

      // Try to drop beyond last item
      const props4 = plugin.api?.getDragHandleProps(4)
      props4?.onDragOver(createDragEvent('dragover', {
        clientY: 250, // Way below item
        currentTarget: {
          getBoundingClientRect: () => ({
            top: 200,
            bottom: 250,
            left: 0,
            right: 100,
            width: 100,
            height: 50,
            x: 0,
            y: 200,
            toJSON: () => {},
          }),
        },
      }))

      // Drop target should be clamped
      expect(plugin.api?.getDropTargetIndex()).toBeLessThanOrEqual(4)
    })
  })
})
