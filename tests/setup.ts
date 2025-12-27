import { vi } from 'vitest'

// Declare global for Node.js environment
declare const global: typeof globalThis

// Mock ResizeObserver
class ResizeObserverMock {
  private callback: ResizeObserverCallback
  private observations: Map<Element, ResizeObserverEntry> = new Map()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    const entry: ResizeObserverEntry = {
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      contentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
    }
    this.observations.set(target, entry)
  }

  unobserve(target: Element): void {
    this.observations.delete(target)
  }

  disconnect(): void {
    this.observations.clear()
  }

  // Helper method for testing
  triggerResize(target: Element, contentRect: Partial<DOMRectReadOnly>): void {
    const entry = this.observations.get(target)
    if (entry) {
      const updatedEntry: ResizeObserverEntry = {
        ...entry,
        contentRect: { ...entry.contentRect, ...contentRect } as DOMRectReadOnly,
      }
      this.callback([updatedEntry], this)
    }
  }
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock requestAnimationFrame
let rafId = 0
const rafCallbacks = new Map<number, FrameRequestCallback>()

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  const id = ++rafId
  rafCallbacks.set(id, callback)
  setTimeout(() => {
    const cb = rafCallbacks.get(id)
    if (cb) {
      rafCallbacks.delete(id)
      cb(performance.now())
    }
  }, 16)
  return id
})

global.cancelAnimationFrame = vi.fn((id: number): void => {
  rafCallbacks.delete(id)
})

// Mock requestIdleCallback
let idleId = 0
const idleCallbacks = new Map<number, ReturnType<typeof setTimeout>>()

global.requestIdleCallback = vi.fn((callback: IdleRequestCallback): number => {
  const id = ++idleId
  const timeoutId = setTimeout(() => {
    idleCallbacks.delete(id)
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    })
  }, 0)
  idleCallbacks.set(id, timeoutId)
  return id
})

global.cancelIdleCallback = vi.fn((id: number): void => {
  const timeoutId = idleCallbacks.get(id)
  if (timeoutId) {
    clearTimeout(timeoutId)
    idleCallbacks.delete(id)
  }
})

// Mock performance.now if not already a mock
if (!vi.isMockFunction(performance.now)) {
  const startTime = Date.now()
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now() - startTime)
}

// Mock scrollTo
Element.prototype.scrollTo = vi.fn(function (
  this: Element,
  optionsOrX?: ScrollToOptions | number,
  y?: number
) {
  if (typeof optionsOrX === 'object') {
    if (optionsOrX.top !== undefined) {
      ;(this as unknown as { scrollTop: number }).scrollTop = optionsOrX.top
    }
    if (optionsOrX.left !== undefined) {
      ;(this as unknown as { scrollLeft: number }).scrollLeft = optionsOrX.left
    }
  } else if (typeof optionsOrX === 'number') {
    ;(this as unknown as { scrollLeft: number }).scrollLeft = optionsOrX
    if (y !== undefined) {
      ;(this as unknown as { scrollTop: number }).scrollTop = y
    }
  }
})

// Helper to flush pending RAF callbacks
export function flushRAF(): void {
  rafCallbacks.forEach((callback, id) => {
    rafCallbacks.delete(id)
    callback(performance.now())
  })
}

// Helper to simulate scroll
export function simulateScroll(
  element: HTMLElement,
  scrollTop: number,
  scrollLeft = 0
): void {
  Object.defineProperty(element, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(element, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true,
  })
  element.dispatchEvent(new Event('scroll'))
}

// Helper to create mock items
export function createMockItems<T extends { id: number }>(
  count: number,
  factory: (index: number) => Omit<T, 'id'>
): T[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    ...factory(i),
  })) as T[]
}
