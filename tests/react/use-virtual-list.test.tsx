import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useVirtualList } from '../../src/react/hooks/use-virtual-list.js'

describe('useVirtualList', () => {
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
      clientWidth: { value: options.width ?? 500, configurable: true },
      clientHeight: { value: options.height ?? 400, configurable: true },
      scrollWidth: { value: options.width ?? 500, configurable: true },
      scrollHeight: { value: options.scrollHeight ?? 2000, configurable: true },
      scrollTop: { value: 0, writable: true, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
    })

    return container
  }

  it('should return initial state', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(result.current.virtualItems).toBeDefined()
    expect(result.current.isScrolling).toBe(false)
    expect(typeof result.current.scrollOffset).toBe('number')
  })

  it('should use getItemKey for keys', () => {
    const getItemKey = vi.fn((index: number) => `item-${index}`)
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 10,
        estimatedItemHeight: 50,
        getItemKey,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should expose scroll methods', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(typeof result.current.scrollTo).toBe('function')
    expect(typeof result.current.scrollToIndex).toBe('function')
  })

  it('should expose measurement methods', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(typeof result.current.measureElement).toBe('function')
    expect(typeof result.current.getMeasurement).toBe('function')
    expect(typeof result.current.invalidateMeasurement).toBe('function')
    expect(typeof result.current.invalidateAllMeasurements).toBe('function')
  })

  it('should expose isScrolling state', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(typeof result.current.isScrolling).toBe('boolean')
    expect(result.current.isScrolling).toBe(false)
  })

  it('should handle overscan option', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        overscan: 10,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should handle horizontal direction', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        horizontal: true,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should expose range state', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(result.current.range).toBeDefined()
    expect(typeof result.current.range.startIndex).toBe('number')
    expect(typeof result.current.range.endIndex).toBe('number')
    expect(typeof result.current.range.overscanStartIndex).toBe('number')
    expect(typeof result.current.range.overscanEndIndex).toBe('number')
  })

  it('should handle padding options', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        paddingStart: 20,
        paddingEnd: 20,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
    expect(result.current.totalSize).toBeGreaterThan(0)
  })

  it('should handle initial offset', () => {
    const containerRef = { current: createMockContainer() }

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        estimatedItemHeight: 50,
        initialOffset: 500,
        containerRef,
      })
    )

    expect(result.current.scrollOffset).toBe(500)
  })

  it('should handle custom getItemHeight', () => {
    const containerRef = { current: createMockContainer() }
    const getItemHeight = vi.fn((index: number) => 50 + (index % 3) * 10)

    const { result } = renderHook(() =>
      useVirtualList({
        count: 100,
        getItemHeight,
        estimatedItemHeight: 50,
        containerRef,
      })
    )

    expect(result.current).toBeDefined()
  })
})
