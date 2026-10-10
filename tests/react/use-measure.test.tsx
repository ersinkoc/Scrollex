import { vi } from 'vitest'
import React, { StrictMode, useMemo, useState } from 'react'
import { renderHook, render, act } from '@testing-library/react'
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

describe('useMeasure rendering', () => {
  beforeEach(() => {
    mockResizeObserverInstance = null
    // Deliver the initial notification on observe(), as browsers do
    globalThis.ResizeObserver = vi.fn((callback: ResizeObserverCallback) => {
      const observer = new MockResizeObserver(callback)
      observer.observe = (element: Element) => {
        observer.observedElements.add(element)
        observer.triggerResize([{ target: element, contentRect: { width: 120, height: 40 } }])
      }
      mockResizeObserverInstance = observer
      return observer
    }) as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render the measured size', () => {
    function Probe() {
      const { measureRef, width, height } = useMeasure()
      return <div ref={measureRef} data-testid="size">{width} x {height}</div>
    }

    let result!: ReturnType<typeof render>
    act(() => {
      result = render(<Probe />)
    })

    expect(result.getByTestId('size').textContent).toBe('120 x 40')
  })

  it('should settle with an inline onResize that sets state', () => {
    let calls = 0
    function Probe() {
      const [, setSize] = useState({ width: 0, height: 0 })
      const { measureRef } = useMeasure({
        onResize: (width, height) => {
          calls++
          if (calls < 100) setSize({ width, height })
        },
      })
      return <div ref={measureRef} />
    }

    act(() => {
      render(<Probe />)
    })

    // the first reading and the observer's own report, then it is quiet
    expect(calls).toBe(2)
    expect(globalThis.ResizeObserver).toHaveBeenCalledTimes(1)
  })
})

describe('useMeasureMany first commit', () => {
  type Size = [string | number, number, number]
  let observers: MockResizeObserver[] = []
  let savedObserver: typeof ResizeObserver

  beforeEach(() => {
    observers = []
    savedObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = vi.fn((callback) => {
      const observer = new MockResizeObserver(callback)
      observers.push(observer)
      return observer
    }) as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    globalThis.ResizeObserver = savedObserver
  })

  function Rows({ keys, onSize }: { keys: string[]; onSize: (key: string | number, width: number, height: number) => void }) {
    const { createMeasureRef, onMeasure } = useMeasureMany()
    onMeasure(onSize)
    return <div>{keys.map((key) => <div key={key} data-k={key} ref={createMeasureRef(key)} />)}</div>
  }

  function MemoRows({ onSize }: { onSize: (key: string | number, width: number, height: number) => void }) {
    const { createMeasureRef, onMeasure } = useMeasureMany()
    onMeasure(onSize)
    const refs = useMemo(() => ({ a: createMeasureRef('a'), b: createMeasureRef('b') }), [createMeasureRef])
    return <div><div data-k="a" ref={refs.a} /><div data-k="b" ref={refs.b} /></div>
  }

  const keysOf = (observer: MockResizeObserver) => [...observer.observedElements].map((el) => (el as HTMLElement).dataset['k'])

  it('should observe the elements that are mounted together with the hook', async () => {
    const sizes: Size[] = []
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<Rows keys={['a', 'b']} onSize={(k, w, h) => { sizes.push([k, w, h]) }} />) })

    const observer = observers[observers.length - 1]!
    expect(keysOf(observer)).toEqual(['a', 'b'])
    await act(async () => {
      observer.triggerResize([{ target: view.container.querySelector('[data-k="a"]')!, contentRect: { width: 100, height: 40 } }])
    })
    expect(sizes).toEqual([['a', 100, 40]])
  })

  it('should keep observing the first-commit elements under StrictMode', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<StrictMode><Rows keys={['a', 'b']} onSize={() => {}} /></StrictMode>) })

    expect(keysOf(observers[observers.length - 1]!)).toEqual(['a', 'b'])
    view.unmount()
    expect(observers[observers.length - 1]!.observedElements.size).toBe(0)
  })

  it('should observe memoised ref callbacks that no re-render re-attaches', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<MemoRows onSize={() => {}} />) })
    await act(async () => { view.rerender(<MemoRows onSize={() => {}} />) })

    expect(keysOf(observers[observers.length - 1]!)).toEqual(['a', 'b'])
  })
})

describe('useMeasure first commit without an observer report', () => {
  let savedObserver: typeof ResizeObserver
  let savedRect: typeof Element.prototype.getBoundingClientRect

  beforeEach(() => {
    savedObserver = globalThis.ResizeObserver
    savedRect = Element.prototype.getBoundingClientRect
    // an observer that never reports
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
    Element.prototype.getBoundingClientRect = () => ({ width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  })

  afterEach(() => {
    globalThis.ResizeObserver = savedObserver
    Element.prototype.getBoundingClientRect = savedRect
  })

  function Box({ lateMount = false }: { lateMount?: boolean }) {
    const { measureRef, width, height } = useMeasure()
    const [show, setShow] = useState(!lateMount)
    return (
      <div>
        <button onClick={() => setShow(true)}>show</button>
        {show && <div ref={measureRef} data-testid="box">{width}x{height}</div>}
      </div>
    )
  }

  it('should measure an element that mounts with the component', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(<Box />) })

    expect(view.getByTestId('box').textContent).toBe('100x50')
  })

  it('should measure an element that mounts later (control)', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(<Box lateMount />) })
    act(() => { view.getByText('show').click() })

    expect(view.getByTestId('box').textContent).toBe('100x50')
  })

  it('should call onResize with the first reading', () => {
    const onResize = vi.fn()
    function Probe() {
      const { measureRef } = useMeasure({ onResize })
      return <div ref={measureRef} />
    }

    act(() => { render(<Probe />) })

    expect(onResize).toHaveBeenCalledWith(100, 50)
  })
})

describe('useMeasure border box vs content box', () => {
  let report: ResizeObserverCallback | null = null
  const targets = new Set<Element>()
  let savedObserver: typeof ResizeObserver
  let savedRect: typeof Element.prototype.getBoundingClientRect

  beforeEach(() => {
    targets.clear()
    savedObserver = globalThis.ResizeObserver
    savedRect = Element.prototype.getBoundingClientRect
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) { report = callback }
      observe(target: Element) { targets.add(target) }
      unobserve(target: Element) { targets.delete(target) }
      disconnect() { targets.clear() }
    } as unknown as typeof ResizeObserver
    Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const height = Number(this.getAttribute('data-border') ?? 0)
      return { width: 100, height, top: 0, left: 0, right: 100, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    }
  })

  afterEach(() => {
    globalThis.ResizeObserver = savedObserver
    Element.prototype.getBoundingClientRect = savedRect
  })

  const entryFor = (target: Element, content: number, border: number | null) => ({
    target,
    contentRect: { width: 100, height: content },
    ...(border === null ? {} : { borderBoxSize: [{ inlineSize: 100, blockSize: border }] }),
  }) as unknown as ResizeObserverEntry

  function Box({ border }: { border: number }) {
    const { measureRef, height } = useMeasure()
    return <div ref={measureRef} data-border={border} data-testid="box">{height}</div>
  }

  it('should keep the border box size when the observer reports an unchanged padded element', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(<Box border={72} />) })
    expect(view.getByTestId('box').textContent).toBe('72')

    act(() => { for (const target of targets) report!([entryFor(target, 40, 72)], {} as ResizeObserver) })

    expect(view.getByTestId('box').textContent).toBe('72')
  })

  it('should use contentRect when an entry has no border box size', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(<Box border={72} />) })

    act(() => { for (const target of targets) report!([entryFor(target, 40, null)], {} as ResizeObserver) })

    expect(view.getByTestId('box').textContent).toBe('40')
  })

  it('should report the border box in useMeasureMany too', () => {
    const seen: Array<[string | number, number, number]> = []
    function Many() {
      const { createMeasureRef, onMeasure } = useMeasureMany()
      onMeasure((key, width, height) => { seen.push([key, width, height]) })
      return <div ref={createMeasureRef('a')} data-border={72} />
    }

    act(() => { render(<Many />) })
    act(() => { for (const target of targets) report!([entryFor(target, 40, 72)], {} as ResizeObserver) })

    expect(seen).toEqual([['a', 100, 72]])
  })
})
