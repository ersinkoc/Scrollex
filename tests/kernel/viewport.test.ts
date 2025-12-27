import { vi } from 'vitest'
import { ViewportManager } from '../../src/kernel/viewport.js'

function createMockElement(dimensions: {
  clientWidth?: number
  clientHeight?: number
  scrollWidth?: number
  scrollHeight?: number
}): HTMLElement {
  const element = document.createElement('div')

  Object.defineProperty(element, 'clientWidth', {
    value: dimensions.clientWidth ?? 800,
    configurable: true,
  })
  Object.defineProperty(element, 'clientHeight', {
    value: dimensions.clientHeight ?? 600,
    configurable: true,
  })
  Object.defineProperty(element, 'scrollWidth', {
    value: dimensions.scrollWidth ?? 1600,
    configurable: true,
  })
  Object.defineProperty(element, 'scrollHeight', {
    value: dimensions.scrollHeight ?? 1200,
    configurable: true,
  })

  return element
}

describe('ViewportManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('attach', () => {
    it('should attach to container', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)

      expect(manager.isAttached()).toBe(true)
      expect(manager.getContainer()).toBe(container)
    })

    it('should measure initial viewport', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 500,
        clientHeight: 400,
        scrollWidth: 1000,
        scrollHeight: 800,
      })

      manager.attach(container)

      const viewport = manager.getViewport()
      expect(viewport.width).toBe(500)
      expect(viewport.height).toBe(400)
      expect(viewport.scrollWidth).toBe(1000)
      expect(viewport.scrollHeight).toBe(800)
    })

    it('should detach from previous container', () => {
      const manager = new ViewportManager()
      const container1 = createMockElement({ clientWidth: 100 })
      const container2 = createMockElement({ clientWidth: 200 })

      manager.attach(container1)
      manager.attach(container2)

      expect(manager.getContainer()).toBe(container2)
      expect(manager.getWidth()).toBe(200)
    })
  })

  describe('detach', () => {
    it('should detach from container', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)
      manager.detach()

      expect(manager.isAttached()).toBe(false)
      expect(manager.getContainer()).toBeNull()
    })

    it('should handle detach when not attached', () => {
      const manager = new ViewportManager()

      expect(() => manager.detach()).not.toThrow()
    })
  })

  describe('getViewport', () => {
    it('should return current viewport dimensions', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 640,
        clientHeight: 480,
        scrollWidth: 1280,
        scrollHeight: 960,
      })

      manager.attach(container)
      const viewport = manager.getViewport()

      expect(viewport).toEqual({
        width: 640,
        height: 480,
        scrollWidth: 1280,
        scrollHeight: 960,
      })
    })

    it('should return copy not reference', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)
      const viewport1 = manager.getViewport()
      const viewport2 = manager.getViewport()

      expect(viewport1).not.toBe(viewport2)
      expect(viewport1).toEqual(viewport2)
    })
  })

  describe('measure', () => {
    it('should update viewport dimensions', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
      })

      manager.attach(container)

      // Simulate resize
      Object.defineProperty(container, 'clientWidth', { value: 1024 })
      Object.defineProperty(container, 'clientHeight', { value: 768 })

      const viewport = manager.measure()

      expect(viewport.width).toBe(1024)
      expect(viewport.height).toBe(768)
    })

    it('should call onChange callback when dimensions change', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Simulate resize
      Object.defineProperty(container, 'clientWidth', { value: 1024 })
      manager.measure()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resize',
          viewport: expect.objectContaining({ width: 1024 }),
          previousViewport: expect.objectContaining({ width: 800 }),
        })
      )
    })

    it('should not call onChange when dimensions unchanged', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)
      manager.measure()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should return viewport even when not attached', () => {
      const manager = new ViewportManager()
      const viewport = manager.measure()

      expect(viewport).toEqual({
        width: 0,
        height: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      })
    })
  })

  describe('updateScrollDimensions', () => {
    it('should update scroll dimensions', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        scrollWidth: 1000,
        scrollHeight: 2000,
      })

      manager.attach(container)
      manager.updateScrollDimensions(3000, 4000)

      expect(manager.getScrollWidth()).toBe(3000)
      expect(manager.getScrollHeight()).toBe(4000)
    })
  })

  describe('onChange', () => {
    it('should set callback', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Trigger resize
      Object.defineProperty(container, 'clientWidth', { value: 1000 })
      manager.measure()

      expect(callback).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)
      manager.onChange(null)

      Object.defineProperty(container, 'clientWidth', { value: 1000 })
      manager.measure()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getContainer', () => {
    it('should return container when attached', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)

      expect(manager.getContainer()).toBe(container)
    })

    it('should return null when not attached', () => {
      const manager = new ViewportManager()

      expect(manager.getContainer()).toBeNull()
    })
  })

  describe('isAttached', () => {
    it('should return true when attached', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)

      expect(manager.isAttached()).toBe(true)
    })

    it('should return false when not attached', () => {
      const manager = new ViewportManager()

      expect(manager.isAttached()).toBe(false)
    })

    it('should return false after detach', () => {
      const manager = new ViewportManager()
      const container = createMockElement({})

      manager.attach(container)
      manager.detach()

      expect(manager.isAttached()).toBe(false)
    })
  })

  describe('dimension getters', () => {
    it('should return individual dimensions', () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
        scrollWidth: 1600,
        scrollHeight: 1200,
      })

      manager.attach(container)

      expect(manager.getWidth()).toBe(800)
      expect(manager.getHeight()).toBe(600)
      expect(manager.getScrollWidth()).toBe(1600)
      expect(manager.getScrollHeight()).toBe(1200)
    })
  })

  describe('ResizeObserver handling', () => {
    let resizeCallbacks: ResizeObserverCallback[]
    let originalResizeObserver: typeof ResizeObserver

    beforeEach(() => {
      resizeCallbacks = []
      originalResizeObserver = window.ResizeObserver

      // Mock ResizeObserver to capture and trigger callbacks
      window.ResizeObserver = class MockResizeObserver {
        callback: ResizeObserverCallback

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
          resizeCallbacks.push(callback)
        }

        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    })

    afterEach(() => {
      window.ResizeObserver = originalResizeObserver
    })

    it('should trigger callback when dimensions change via ResizeObserver', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
        scrollWidth: 1600,
        scrollHeight: 1200,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Simulate resize
      Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true })
      Object.defineProperty(container, 'clientHeight', { value: 768, configurable: true })

      // Trigger ResizeObserver callback
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF
      await vi.runOnlyPendingTimersAsync()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resize',
          viewport: expect.objectContaining({ width: 1024, height: 768 }),
          previousViewport: expect.objectContaining({ width: 800, height: 600 }),
        })
      )
    })

    it('should not trigger callback when dimensions unchanged via ResizeObserver', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
        scrollWidth: 1600,
        scrollHeight: 1200,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Trigger ResizeObserver callback without changing dimensions
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF
      await vi.runOnlyPendingTimersAsync()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle resize when scrollWidth changes', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
        scrollWidth: 1600,
        scrollHeight: 1200,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Change only scrollWidth
      Object.defineProperty(container, 'scrollWidth', { value: 2000, configurable: true })

      // Trigger ResizeObserver callback
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF
      await vi.runOnlyPendingTimersAsync()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resize',
          viewport: expect.objectContaining({ scrollWidth: 2000 }),
          previousViewport: expect.objectContaining({ scrollWidth: 1600 }),
        })
      )
    })

    it('should handle resize when scrollHeight changes', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
        scrollWidth: 1600,
        scrollHeight: 1200,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Change only scrollHeight
      Object.defineProperty(container, 'scrollHeight', { value: 2400, configurable: true })

      // Trigger ResizeObserver callback
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF
      await vi.runOnlyPendingTimersAsync()

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resize',
          viewport: expect.objectContaining({ scrollHeight: 2400 }),
          previousViewport: expect.objectContaining({ scrollHeight: 1200 }),
        })
      )
    })

    it('should not throw when no callback set during resize', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
      })

      manager.attach(container)

      // Change dimensions
      Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true })

      // Trigger ResizeObserver callback without callback set
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF - should not throw
      await expect(vi.runOnlyPendingTimersAsync()).resolves.not.toThrow()
    })

    it('should handle detach while resize pending', async () => {
      const manager = new ViewportManager()
      const container = createMockElement({
        clientWidth: 800,
        clientHeight: 600,
      })
      const callback = vi.fn()

      manager.attach(container)
      manager.onChange(callback)

      // Detach before resize callback fires
      manager.detach()

      // Change dimensions (though this won't matter since detached)
      Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true })

      // Trigger ResizeObserver callback after detach
      resizeCallbacks[0]?.([], {} as ResizeObserver)

      // Run RAF
      await vi.runOnlyPendingTimersAsync()

      // Should not call callback since container is null
      expect(callback).not.toHaveBeenCalled()
    })
  })
})
