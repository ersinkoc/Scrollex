import { vi } from 'vitest'
import { ScrollEngine, easings } from '../../src/kernel/scroll-engine.js'

describe('ScrollEngine', () => {
  let engine: ScrollEngine
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    engine = new ScrollEngine()

    // Create mock container
    container = document.createElement('div')
    Object.defineProperties(container, {
      scrollTop: { value: 0, writable: true, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
      scrollHeight: { value: 2000, configurable: true },
      scrollWidth: { value: 500, configurable: true },
      clientHeight: { value: 400, configurable: true },
      clientWidth: { value: 500, configurable: true },
    })
  })

  afterEach(() => {
    engine.detach()
    vi.useRealTimers()
  })

  describe('attach', () => {
    it('should attach to container', () => {
      engine.attach(container)

      expect(engine.isAttached()).toBe(true)
      expect(engine.getContainer()).toBe(container)
    })

    it('should get initial scroll position', () => {
      Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true })
      engine.attach(container)

      expect(engine.getScrollPosition()).toEqual({ scrollTop: 100, scrollLeft: 0 })
    })

    it('should detach before attaching to new container', () => {
      const container2 = document.createElement('div')
      Object.defineProperties(container2, {
        scrollTop: { value: 50, writable: true, configurable: true },
        scrollLeft: { value: 0, writable: true, configurable: true },
      })

      engine.attach(container)
      engine.attach(container2)

      expect(engine.getContainer()).toBe(container2)
      expect(engine.getScrollPosition()).toEqual({ scrollTop: 50, scrollLeft: 0 })
    })
  })

  describe('detach', () => {
    it('should detach from container', () => {
      engine.attach(container)
      engine.detach()

      expect(engine.isAttached()).toBe(false)
      expect(engine.getContainer()).toBeNull()
    })

    it('should handle detach when not attached', () => {
      expect(() => engine.detach()).not.toThrow()
    })

    it('should cancel pending scroll end timer', async () => {
      engine.attach(container)

      // Trigger scroll to start the timer
      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      engine.detach()

      // No error should occur
      await vi.advanceTimersByTimeAsync(200)
    })

    it('should cancel ongoing animation', () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 500 })

      expect(engine.isAnimating()).toBe(true)

      engine.detach()

      expect(engine.isAnimating()).toBe(false)
    })
  })

  describe('processScroll', () => {
    it('should emit scroll event on scroll', async () => {
      const onScroll = vi.fn()
      engine.attach(container)
      engine.onScroll(onScroll)

      container.dispatchEvent(new Event('scroll'))
      // RAF callback needs to be run
      await vi.runOnlyPendingTimersAsync()

      expect(onScroll).toHaveBeenCalled()
      expect(onScroll.mock.calls[0][0].type).toBe('scroll')
    })

    it('should emit scroll start event once', async () => {
      const onScrollStart = vi.fn()
      engine.attach(container)
      engine.onScrollStart(onScrollStart)

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      expect(onScrollStart).toHaveBeenCalledTimes(1)
    })

    it('should emit scroll end event after delay', async () => {
      const onScrollEnd = vi.fn()
      engine.attach(container)
      engine.onScrollEnd(onScrollEnd)

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      expect(onScrollEnd).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(150)

      expect(onScrollEnd).toHaveBeenCalledTimes(1)
      expect(onScrollEnd.mock.calls[0][0].type).toBe('scroll-end')
    })

    it('should reset scroll end timer on subsequent scroll', async () => {
      const onScrollEnd = vi.fn()
      engine.attach(container)
      engine.onScrollEnd(onScrollEnd)

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      await vi.advanceTimersByTimeAsync(100)

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      await vi.advanceTimersByTimeAsync(100)

      expect(onScrollEnd).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(50)

      expect(onScrollEnd).toHaveBeenCalledTimes(1)
    })

    it('should track scroll direction', async () => {
      engine.attach(container)

      // Simulate scroll down
      Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true })
      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      expect(engine.getScrollDirection()).toBe('down')
    })
  })

  describe('setScrollPosition', () => {
    it('should set scroll position', () => {
      engine.attach(container)
      engine.setScrollPosition({ scrollTop: 200 })

      expect(engine.getScrollPosition().scrollTop).toBe(200)
    })

    it('should handle partial position updates', () => {
      engine.attach(container)
      engine.setScrollPosition({ scrollTop: 100 })
      engine.setScrollPosition({ scrollLeft: 50 })

      expect(engine.getScrollPosition()).toEqual({ scrollTop: 100, scrollLeft: 50 })
    })

    it('should do nothing without container', () => {
      expect(() => engine.setScrollPosition({ scrollTop: 100 })).not.toThrow()
    })

    it('should cancel ongoing animation', () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 500 })

      expect(engine.isAnimating()).toBe(true)

      engine.setScrollPosition({ scrollTop: 100 })

      expect(engine.isAnimating()).toBe(false)
    })
  })

  describe('scrollTo', () => {
    it('should scroll instantly with auto behavior', () => {
      engine.attach(container)
      engine.scrollTo(300)

      expect(engine.getScrollPosition().scrollTop).toBe(300)
    })

    it('should scroll instantly with smooth behavior and zero duration', () => {
      engine.attach(container)
      engine.scrollTo(300, { behavior: 'smooth', duration: 0 })

      expect(engine.getScrollPosition().scrollTop).toBe(300)
    })

    it('should animate with smooth behavior', async () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 100 })

      expect(engine.isAnimating()).toBe(true)

      await vi.advanceTimersByTimeAsync(150)

      expect(engine.isAnimating()).toBe(false)
    })

    it('should do nothing without container', () => {
      expect(() => engine.scrollTo(100)).not.toThrow()
    })

    it('should use custom easing', async () => {
      const customEasing = vi.fn((t: number) => t)
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 100, easing: customEasing })

      await vi.advanceTimersByTimeAsync(150)

      expect(customEasing).toHaveBeenCalled()
    })
  })

  describe('animateScroll', () => {
    it('should animate scroll position over time', async () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 100 })

      // Midway through animation
      await vi.advanceTimersByTimeAsync(50)

      const midPosition = engine.getScrollPosition().scrollTop
      expect(midPosition).toBeGreaterThan(0)
      expect(midPosition).toBeLessThan(500)

      // After animation
      await vi.advanceTimersByTimeAsync(100)

      expect(engine.getScrollPosition().scrollTop).toBe(500)
    })

    it('should cancel previous animation when starting new one', async () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 200 })

      await vi.advanceTimersByTimeAsync(50)

      // Start new animation
      engine.scrollTo(100, { behavior: 'smooth', duration: 100 })

      await vi.advanceTimersByTimeAsync(150)

      expect(engine.getScrollPosition().scrollTop).toBe(100)
    })
  })

  describe('isScrolling', () => {
    it('should return false initially', () => {
      engine.attach(container)
      expect(engine.isScrolling()).toBe(false)
    })

    it('should return true during scroll', async () => {
      engine.attach(container)
      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      expect(engine.isScrolling()).toBe(true)
    })

    it('should return false after scroll ends', async () => {
      engine.attach(container)
      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      await vi.advanceTimersByTimeAsync(200)

      expect(engine.isScrolling()).toBe(false)
    })
  })

  describe('isAnimating', () => {
    it('should return false initially', () => {
      engine.attach(container)
      expect(engine.isAnimating()).toBe(false)
    })

    it('should return true during animation', () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 100 })

      expect(engine.isAnimating()).toBe(true)
    })
  })

  describe('stopAnimation', () => {
    it('should stop ongoing animation', () => {
      engine.attach(container)
      engine.scrollTo(500, { behavior: 'smooth', duration: 500 })

      expect(engine.isAnimating()).toBe(true)

      engine.stopAnimation()

      expect(engine.isAnimating()).toBe(false)
    })

    it('should not throw when no animation', () => {
      engine.attach(container)
      expect(() => engine.stopAnimation()).not.toThrow()
    })
  })

  describe('setScrollEndDelay', () => {
    it('should change scroll end delay', async () => {
      const onScrollEnd = vi.fn()
      engine.attach(container)
      engine.onScrollEnd(onScrollEnd)
      engine.setScrollEndDelay(50)

      container.dispatchEvent(new Event('scroll'))
      await vi.runOnlyPendingTimersAsync()

      await vi.advanceTimersByTimeAsync(25)
      expect(onScrollEnd).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(30)
      expect(onScrollEnd).toHaveBeenCalledTimes(1)
    })
  })

  describe('callbacks', () => {
    it('should allow setting null callbacks', () => {
      engine.onScroll(null)
      engine.onScrollStart(null)
      engine.onScrollEnd(null)

      expect(true).toBe(true)
    })
  })
})

describe('easings', () => {
  it('should have linear easing', () => {
    expect(easings.linear(0)).toBe(0)
    expect(easings.linear(0.5)).toBe(0.5)
    expect(easings.linear(1)).toBe(1)
  })

  it('should have easeIn easing', () => {
    expect(easings.easeIn(0)).toBe(0)
    expect(easings.easeIn(1)).toBe(1)
    expect(easings.easeIn(0.5)).toBe(0.25)
  })

  it('should have easeOut easing', () => {
    expect(easings.easeOut(0)).toBe(0)
    expect(easings.easeOut(1)).toBe(1)
    expect(easings.easeOut(0.5)).toBe(0.75)
  })

  it('should have easeInOut easing', () => {
    expect(easings.easeInOut(0)).toBe(0)
    expect(easings.easeInOut(1)).toBe(1)
    expect(easings.easeInOut(0.5)).toBe(0.5)
  })

  it('should have easeInCubic easing', () => {
    expect(easings.easeInCubic(0)).toBe(0)
    expect(easings.easeInCubic(1)).toBe(1)
    expect(easings.easeInCubic(0.5)).toBe(0.125)
  })

  it('should have easeOutCubic easing', () => {
    expect(easings.easeOutCubic(0)).toBe(0)
    expect(easings.easeOutCubic(1)).toBe(1)
    expect(easings.easeOutCubic(0.5)).toBeCloseTo(0.875)
  })

  it('should have easeInOutCubic easing', () => {
    expect(easings.easeInOutCubic(0)).toBe(0)
    expect(easings.easeInOutCubic(1)).toBe(1)
    expect(easings.easeInOutCubic(0.5)).toBe(0.5)
    expect(easings.easeInOutCubic(0.25)).toBeCloseTo(0.0625)
    expect(easings.easeInOutCubic(0.75)).toBeCloseTo(0.9375)
  })
})
