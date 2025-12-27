import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMeasure, useMeasureMany } from '../../src/react/hooks/use-measure.js'

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback
  observedElements: Set<Element> = new Set()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(element: Element) {
    this.observedElements.add(element)
  }

  unobserve(element: Element) {
    this.observedElements.delete(element)
  }

  disconnect() {
    this.observedElements.clear()
  }

  // Helper to trigger resize
  triggerResize(entries: Array<{ target: Element; contentRect: { width: number; height: number } }>) {
    this.callback(
      entries.map((entry) => ({
        target: entry.target,
        contentRect: entry.contentRect as DOMRectReadOnly,
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      })),
      this
    )
  }
}

// Store mock instance for triggering
let mockResizeObserverInstance: MockResizeObserver | null = null

describe('useMeasure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockResizeObserverInstance = null

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn((callback) => {
      mockResizeObserverInstance = new MockResizeObserver(callback)
      return mockResizeObserverInstance
    }) as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => useMeasure())

    expect(result.current.width).toBe(0)
    expect(result.current.height).toBe(0)
    expect(typeof result.current.measureRef).toBe('function')
  })

  it('should measure element when ref is attached', () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize }))

    // Create mock element
    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    // Verify via callback since hook uses ref (not state)
    expect(onResize).toHaveBeenCalledWith(200, 100)
  })

  it('should call onResize callback', () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize }))

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 150,
      top: 0,
      left: 0,
      bottom: 150,
      right: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    expect(onResize).toHaveBeenCalledWith(300, 150)
  })

  it('should debounce onResize callback', async () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize, debounce: 100 }))

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    // Should not have called immediately
    expect(onResize).not.toHaveBeenCalled()

    // Advance timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(onResize).toHaveBeenCalledWith(400, 200)
  })

  it('should update on resize observer events', () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize }))

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      bottom: 50,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    expect(onResize).toHaveBeenCalledWith(100, 50)

    // Trigger resize via observer
    act(() => {
      mockResizeObserverInstance?.triggerResize([
        { target: element, contentRect: { width: 500, height: 250 } },
      ])
    })

    expect(onResize).toHaveBeenCalledWith(500, 250)
    expect(onResize).toHaveBeenCalledTimes(2)
  })

  it('should unobserve old element when ref changes', () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize }))

    const element1 = document.createElement('div')
    vi.spyOn(element1, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element1)
    })

    expect(mockResizeObserverInstance?.observedElements.has(element1)).toBe(true)
    expect(onResize).toHaveBeenCalledWith(100, 100)

    const element2 = document.createElement('div')
    vi.spyOn(element2, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element2)
    })

    expect(mockResizeObserverInstance?.observedElements.has(element1)).toBe(false)
    expect(mockResizeObserverInstance?.observedElements.has(element2)).toBe(true)
    expect(onResize).toHaveBeenCalledWith(200, 200)
  })

  it('should handle null element', () => {
    const { result } = renderHook(() => useMeasure())

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    act(() => {
      result.current.measureRef(null)
    })

    expect(mockResizeObserverInstance?.observedElements.size).toBe(0)
  })

  it('should cleanup on unmount', async () => {
    const onResize = vi.fn()
    const { result, unmount } = renderHook(() => useMeasure({ onResize, debounce: 100 }))

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      result.current.measureRef(element)
    })

    // Unmount before debounce timer fires
    unmount()

    // Timer should be cleared, no callback after unmount
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })

    expect(onResize).not.toHaveBeenCalled()
  })

  it('should cancel previous debounce timer on rapid updates', async () => {
    const onResize = vi.fn()
    const { result } = renderHook(() => useMeasure({ onResize, debounce: 100 }))

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect')
      .mockReturnValueOnce({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
      .mockReturnValueOnce({
        width: 200,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })

    act(() => {
      result.current.measureRef(element)
    })

    // Advance partially
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })

    // Trigger another resize before debounce completes
    act(() => {
      mockResizeObserverInstance?.triggerResize([
        { target: element, contentRect: { width: 200, height: 200 } },
      ])
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // Should only have called once with final value
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith(200, 200)
  })
})

describe('useMeasureMany', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockResizeObserverInstance = null

    global.ResizeObserver = vi.fn((callback) => {
      mockResizeObserverInstance = new MockResizeObserver(callback)
      return mockResizeObserverInstance
    }) as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should return methods', () => {
    const { result } = renderHook(() => useMeasureMany())

    expect(typeof result.current.createMeasureRef).toBe('function')
    expect(typeof result.current.getMeasurement).toBe('function')
    expect(typeof result.current.onMeasure).toBe('function')
    expect(typeof result.current.clear).toBe('function')
  })

  it('should measure element with createMeasureRef', () => {
    const { result } = renderHook(() => useMeasureMany())

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 150,
      height: 75,
      top: 0,
      left: 0,
      bottom: 75,
      right: 150,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('item-1')
      ref(element)
    })

    const measurement = result.current.getMeasurement('item-1')
    expect(measurement).toEqual({ width: 150, height: 75 })
  })

  it('should handle numeric keys', () => {
    const { result } = renderHook(() => useMeasureMany())

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      bottom: 50,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef(42)
      ref(element)
    })

    expect(result.current.getMeasurement(42)).toEqual({ width: 100, height: 50 })
  })

  it('should call onMeasure callback on resize', () => {
    const onMeasureCallback = vi.fn()
    const { result } = renderHook(() => useMeasureMany())

    act(() => {
      result.current.onMeasure(onMeasureCallback)
    })

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('key1')
      ref(element)
    })

    // Trigger resize
    act(() => {
      mockResizeObserverInstance?.triggerResize([
        { target: element, contentRect: { width: 300, height: 150 } },
      ])
    })

    expect(onMeasureCallback).toHaveBeenCalledWith('key1', 300, 150)
  })

  it('should unobserve old element when key changes to new element', () => {
    const { result } = renderHook(() => useMeasureMany())

    const element1 = document.createElement('div')
    vi.spyOn(element1, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('key1')
      ref(element1)
    })

    expect(mockResizeObserverInstance?.observedElements.has(element1)).toBe(true)

    const element2 = document.createElement('div')
    vi.spyOn(element2, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('key1')
      ref(element2)
    })

    expect(mockResizeObserverInstance?.observedElements.has(element1)).toBe(false)
    expect(mockResizeObserverInstance?.observedElements.has(element2)).toBe(true)
  })

  it('should clear all elements', () => {
    const { result } = renderHook(() => useMeasureMany())

    const elements: HTMLElement[] = []
    for (let i = 0; i < 3; i++) {
      const element = document.createElement('div')
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
      elements.push(element)
    }

    act(() => {
      elements.forEach((el, i) => {
        const ref = result.current.createMeasureRef(`key-${i}`)
        ref(el)
      })
    })

    expect(mockResizeObserverInstance?.observedElements.size).toBe(3)

    act(() => {
      result.current.clear()
    })

    expect(mockResizeObserverInstance?.observedElements.size).toBe(0)
    expect(result.current.getMeasurement('key-0')).toBeUndefined()
  })

  it('should return undefined for unknown key', () => {
    const { result } = renderHook(() => useMeasureMany())

    expect(result.current.getMeasurement('unknown')).toBeUndefined()
  })

  it('should handle element without data-measure-key gracefully', () => {
    const { result } = renderHook(() => useMeasureMany())

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('test-key')
      ref(element)
    })

    // Remove the data attribute and trigger resize
    delete element.dataset['measureKey']

    act(() => {
      mockResizeObserverInstance?.triggerResize([
        { target: element, contentRect: { width: 200, height: 200 } },
      ])
    })

    // Should not update measurement without key
    expect(result.current.getMeasurement('test-key')).toEqual({ width: 100, height: 100 })
  })

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useMeasureMany())

    const element = document.createElement('div')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      const ref = result.current.createMeasureRef('key')
      ref(element)
    })

    unmount()

    // Observer should be disconnected
    expect(mockResizeObserverInstance?.observedElements.size).toBe(0)
  })
})
