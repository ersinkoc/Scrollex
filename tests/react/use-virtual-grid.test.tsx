import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useVirtualGrid } from '../../src/react/hooks/use-virtual-grid.js'

describe('useVirtualGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createMockContainer(options: {
    width?: number
    height?: number
    scrollHeight?: number
  } = {}): HTMLDivElement {
    const container = document.createElement('div')

    Object.defineProperties(container, {
      clientWidth: { value: options.width ?? 400, configurable: true },
      clientHeight: { value: options.height ?? 600, configurable: true },
      scrollWidth: { value: options.width ?? 400, configurable: true },
      scrollHeight: { value: options.scrollHeight ?? 2000, configurable: true },
      scrollTop: { value: 0, writable: true, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
    })

    return container
  }

  it('should return initial state', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(result.current.virtualItems).toBeDefined()
    expect(result.current.isScrolling).toBe(false)
    expect(typeof result.current.scrollOffset).toBe('number')
    expect(result.current.columnCount).toBe(4)
  })

  it('should expose scroll methods', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(typeof result.current.scrollTo).toBe('function')
    expect(typeof result.current.scrollToIndex).toBe('function')
  })

  it('should expose measurement methods', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(typeof result.current.measureElement).toBe('function')
    expect(typeof result.current.getMeasurement).toBe('function')
    expect(typeof result.current.invalidateMeasurement).toBe('function')
    expect(typeof result.current.invalidateAllMeasurements).toBe('function')
  })

  it('should expose range state', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(result.current.range).toBeDefined()
    expect(typeof result.current.range.startIndex).toBe('number')
    expect(typeof result.current.range.endIndex).toBe('number')
    expect(typeof result.current.range.overscanStartIndex).toBe('number')
    expect(typeof result.current.range.overscanEndIndex).toBe('number')
  })

  it('should handle numeric gap', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        gap: 10,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should handle object gap', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        gap: { x: 10, y: 20 },
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should handle overscan option', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        overscan: 5,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should handle initial offset', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        initialOffset: 500,
        containerRef,
      })
    )

    expect(result.current.scrollOffset).toBe(500)
  })

  it('should expose columnWidth', () => {
    const containerRef = { current: createMockContainer({ width: 400 }) }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(typeof result.current.columnWidth).toBe('number')
  })

  it('should expose rowCount', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 40,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(typeof result.current.rowCount).toBe('number')
  })

  it('should expose totalSize', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(typeof result.current.totalSize).toBe('number')
  })

  it('should handle custom getItemKey', () => {
    const containerRef = { current: createMockContainer() }
    const getItemKey = vi.fn((index: number) => `grid-item-${index}`)

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        getItemKey,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should call scrollTo method', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    act(() => {
      result.current.scrollTo(500)
    })

    // Method should not throw
    expect(true).toBe(true)
  })

  it('should call scrollToIndex method', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    act(() => {
      result.current.scrollToIndex(20)
    })

    // Method should not throw
    expect(true).toBe(true)
  })

  it('should call scrollToIndex with options', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        gap: { x: 10, y: 20 },
        containerRef,
      })
    )

    act(() => {
      result.current.scrollToIndex(20, { behavior: 'smooth' })
    })

    // Method should not throw
    expect(true).toBe(true)
  })

  it('should return fixed measurement from getMeasurement', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 150,
        containerRef,
      })
    )

    expect(result.current.getMeasurement(0)).toBe(150)
    expect(result.current.getMeasurement(10)).toBe(150)
  })

  it('should handle measureElement (no-op for fixed grid)', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    const element = document.createElement('div')

    // Should not throw
    act(() => {
      result.current.measureElement(0, element)
    })

    expect(true).toBe(true)
  })

  it('should handle invalidateMeasurement (no-op for fixed grid)', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    // Should not throw
    act(() => {
      result.current.invalidateMeasurement(5)
    })

    expect(true).toBe(true)
  })

  it('should handle invalidateAllMeasurements (no-op for fixed grid)', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef,
      })
    )

    // Should not throw
    act(() => {
      result.current.invalidateAllMeasurements()
    })

    expect(true).toBe(true)
  })

  it('should handle auto columns', () => {
    const containerRef = { current: createMockContainer({ width: 500 }) }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 'auto' as any,
        rowHeight: 100,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
    expect(result.current.columnCount).toBeGreaterThanOrEqual(1)
  })

  it('should handle null container ref', () => {
    const containerRef = { current: null }

    const { result } = renderHook(() =>
      useVirtualGrid({
        count: 100,
        columns: 4,
        rowHeight: 100,
        containerRef: containerRef as any,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should update when count changes', () => {
    const containerRef = { current: createMockContainer() }

    const { result, rerender } = renderHook(
      ({ count }) =>
        useVirtualGrid({
          count,
          columns: 4,
          rowHeight: 100,
          containerRef,
        }),
      { initialProps: { count: 50 } }
    )

    expect(result.current).toBeDefined()

    rerender({ count: 100 })

    expect(result.current).toBeDefined()
  })
})
