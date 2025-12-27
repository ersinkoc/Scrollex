import { vi } from 'vitest'
import { EventBus } from '../../src/kernel/event-bus.js'
import type { ScrollEvent, ResizeEvent } from '../../src/types.js'

// Helper to create scroll events
function createScrollEvent(scrollTop = 100): ScrollEvent {
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

// Helper to create resize events
function createResizeEvent(): ResizeEvent {
  return {
    type: 'resize',
    viewport: { width: 800, height: 600, scrollHeight: 2000, scrollWidth: 800 },
    previousViewport: null,
  }
}

describe('EventBus', () => {
  describe('on', () => {
    it('should subscribe to events', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('scroll', handler)
      const event = createScrollEvent()
      bus.emit(event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should allow multiple handlers for same event', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('scroll', handler1)
      bus.on('scroll', handler2)
      bus.emit(createScrollEvent())

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      const unsubscribe = bus.on('scroll', handler)
      unsubscribe()
      bus.emit(createScrollEvent())

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('off', () => {
    it('should unsubscribe from events', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('scroll', handler)
      bus.off('scroll', handler)
      bus.emit(createScrollEvent())

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not affect other handlers', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('scroll', handler1)
      bus.on('scroll', handler2)
      bus.off('scroll', handler1)
      bus.emit(createScrollEvent())

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should handle unsubscribing non-existent handler', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      // Should not throw
      expect(() => bus.off('scroll', handler)).not.toThrow()
    })
  })

  describe('once', () => {
    it('should only fire handler once', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.once('scroll', handler)
      bus.emit(createScrollEvent(100))
      bus.emit(createScrollEvent(200))

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      const unsubscribe = bus.once('scroll', handler)
      unsubscribe()
      bus.emit(createScrollEvent())

      expect(handler).not.toHaveBeenCalled()
    })

    it('should work alongside regular handlers', () => {
      const bus = new EventBus()
      const onceHandler = vi.fn()
      const regularHandler = vi.fn()

      bus.once('scroll', onceHandler)
      bus.on('scroll', regularHandler)

      bus.emit(createScrollEvent(100))
      bus.emit(createScrollEvent(200))

      expect(onceHandler).toHaveBeenCalledTimes(1)
      expect(regularHandler).toHaveBeenCalledTimes(2)
    })
  })

  describe('emit', () => {
    it('should emit events to handlers', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('scroll-start', handler)
      const event = { type: 'scroll-start' as const, scrollTop: 0, scrollLeft: 0, timestamp: Date.now() }
      bus.emit(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should not emit to handlers of different event types', () => {
      const bus = new EventBus()
      const scrollHandler = vi.fn()
      const resizeHandler = vi.fn()

      bus.on('scroll', scrollHandler)
      bus.on('resize', resizeHandler)
      bus.emit(createScrollEvent())

      expect(scrollHandler).toHaveBeenCalledTimes(1)
      expect(resizeHandler).not.toHaveBeenCalled()
    })

    it('should handle errors in handlers gracefully', () => {
      const bus = new EventBus()
      const errorHandler = vi.fn(() => {
        throw new Error('Test error')
      })
      const successHandler = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      bus.on('scroll', errorHandler)
      bus.on('scroll', successHandler)

      // Should not throw
      expect(() => bus.emit(createScrollEvent())).not.toThrow()

      // Other handlers should still be called
      expect(successHandler).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should queue events emitted during emission', () => {
      const bus = new EventBus()
      const callOrder: number[] = []

      bus.on('scroll', () => {
        callOrder.push(1)
        // Emit another event during handling
        bus.emit({ type: 'scroll-end', scrollTop: 0, scrollLeft: 0, timestamp: Date.now() })
      })

      bus.on('scroll-end', () => {
        callOrder.push(2)
      })

      bus.emit(createScrollEvent())

      // Events should be processed in order
      expect(callOrder).toEqual([1, 2])
    })
  })

  describe('hasHandlers', () => {
    it('should return true when handlers exist', () => {
      const bus = new EventBus()
      bus.on('scroll', vi.fn())

      expect(bus.hasHandlers('scroll')).toBe(true)
    })

    it('should return false when no handlers', () => {
      const bus = new EventBus()

      expect(bus.hasHandlers('scroll')).toBe(false)
    })

    it('should return true for once handlers', () => {
      const bus = new EventBus()
      bus.once('scroll', vi.fn())

      expect(bus.hasHandlers('scroll')).toBe(true)
    })

    it('should return false after all handlers removed', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('scroll', handler)
      bus.off('scroll', handler)

      expect(bus.hasHandlers('scroll')).toBe(false)
    })
  })

  describe('handlerCount', () => {
    it('should return correct count', () => {
      const bus = new EventBus()

      expect(bus.handlerCount('scroll')).toBe(0)

      bus.on('scroll', vi.fn())
      expect(bus.handlerCount('scroll')).toBe(1)

      bus.on('scroll', vi.fn())
      expect(bus.handlerCount('scroll')).toBe(2)
    })

    it('should count both regular and once handlers', () => {
      const bus = new EventBus()

      bus.on('scroll', vi.fn())
      bus.once('scroll', vi.fn())

      expect(bus.handlerCount('scroll')).toBe(2)
    })
  })

  describe('clear', () => {
    it('should remove all handlers', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('scroll', handler1)
      bus.on('resize', handler2)
      bus.clear()

      bus.emit(createScrollEvent())
      bus.emit(createResizeEvent())

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should clear pending events', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('scroll-end', handler)
      bus.on('scroll', () => {
        bus.emit({ type: 'scroll-end', scrollTop: 0, scrollLeft: 0, timestamp: Date.now() })
        bus.clear()
      })

      bus.emit(createScrollEvent())

      // The scroll-end event was queued but cleared
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('clearEvent', () => {
    it('should remove handlers for specific event only', () => {
      const bus = new EventBus()
      const scrollHandler = vi.fn()
      const resizeHandler = vi.fn()

      bus.on('scroll', scrollHandler)
      bus.on('resize', resizeHandler)
      bus.clearEvent('scroll')

      bus.emit(createScrollEvent())
      bus.emit(createResizeEvent())

      expect(scrollHandler).not.toHaveBeenCalled()
      expect(resizeHandler).toHaveBeenCalledTimes(1)
    })

    it('should clear both regular and once handlers', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('scroll', handler1)
      bus.once('scroll', handler2)
      bus.clearEvent('scroll')

      expect(bus.handlerCount('scroll')).toBe(0)
    })
  })
})
