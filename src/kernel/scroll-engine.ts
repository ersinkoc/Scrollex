import type {
  ScrollPosition,
  ScrollDirection,
  ScrollEvent,
  ScrollStartEvent,
  ScrollEndEvent,
  ScrollOptions,
  EasingFunction,
} from '../types.js'
import { throttleRAF } from '../utils/throttle.js'
import { getScrollPosition, setScrollPosition, getScrollDirection } from '../utils/scroll.js'
import { raf, cancelRaf } from '../utils/raf.js'

/**
 * Callback for scroll events.
 */
export type ScrollCallback = (event: ScrollEvent) => void
export type ScrollStartCallback = (event: ScrollStartEvent) => void
export type ScrollEndCallback = (event: ScrollEndEvent) => void

/**
 * Built-in easing functions.
 */
export const easings = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t,
  easeOut: (t: number): number => t * (2 - t),
  easeInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
} as const

/**
 * Manages scroll position tracking and updates.
 */
export class ScrollEngine {
  private container: HTMLElement | null = null
  private scrollPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 }
  private previousScrollPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 }
  private scrolling = false
  private scrollDirection: ScrollDirection = 'none'
  private lastScrollTime = 0
  private scrollEndTimer: ReturnType<typeof setTimeout> | null = null
  private scrollEndDelay = 150

  // Animation state
  private animationId: number | null = null
  private animationStartTime = 0
  private animationStartOffset = 0
  private animationTargetOffset = 0
  private animationDuration = 0
  private animationEasing: EasingFunction = easings.easeInOut

  // Callbacks
  private onScrollCallback: ScrollCallback | null = null
  private onScrollStartCallback: ScrollStartCallback | null = null
  private onScrollEndCallback: ScrollEndCallback | null = null

  // Throttled handler
  private throttledHandleScroll: ReturnType<typeof throttleRAF> | null = null
  private boundHandleScroll: ((event: Event) => void) | null = null

  /**
   * Attach to a container element.
   *
   * @param container - Container element to observe
   */
  attach(container: HTMLElement): void {
    this.detach()

    this.container = container
    this.scrollPosition = getScrollPosition(container)
    this.previousScrollPosition = { ...this.scrollPosition }

    // Create throttled scroll handler
    this.throttledHandleScroll = throttleRAF(this.processScroll.bind(this))
    this.boundHandleScroll = () => this.throttledHandleScroll?.()

    // Add scroll listener
    container.addEventListener('scroll', this.boundHandleScroll, { passive: true })
  }

  /**
   * Detach from the current container.
   */
  detach(): void {
    if (this.container && this.boundHandleScroll) {
      this.container.removeEventListener('scroll', this.boundHandleScroll)
    }

    if (this.throttledHandleScroll) {
      this.throttledHandleScroll.cancel()
      this.throttledHandleScroll = null
    }

    if (this.scrollEndTimer) {
      clearTimeout(this.scrollEndTimer)
      this.scrollEndTimer = null
    }

    if (this.animationId) {
      cancelRaf(this.animationId)
      this.animationId = null
    }

    this.boundHandleScroll = null
    this.container = null
  }

  /**
   * Process scroll event.
   */
  private processScroll(): void {
    if (!this.container) return

    const now = performance.now()
    this.previousScrollPosition = { ...this.scrollPosition }
    this.scrollPosition = getScrollPosition(this.container)

    // Calculate direction
    this.scrollDirection = getScrollDirection(this.scrollPosition, this.previousScrollPosition)

    // Handle scroll start
    if (!this.scrolling) {
      this.scrolling = true
      this.onScrollStartCallback?.({
        type: 'scroll-start',
        scrollTop: this.scrollPosition.scrollTop,
        scrollLeft: this.scrollPosition.scrollLeft,
        timestamp: now,
      })
    }

    // Emit scroll event
    this.onScrollCallback?.({
      type: 'scroll',
      scrollTop: this.scrollPosition.scrollTop,
      scrollLeft: this.scrollPosition.scrollLeft,
      deltaY: this.scrollPosition.scrollTop - this.previousScrollPosition.scrollTop,
      deltaX: this.scrollPosition.scrollLeft - this.previousScrollPosition.scrollLeft,
      direction: this.scrollDirection,
      timestamp: now,
    })

    this.lastScrollTime = now

    // Schedule scroll end detection
    this.scheduleScrollEnd()
  }

  /**
   * Schedule scroll end detection.
   */
  private scheduleScrollEnd(): void {
    if (this.scrollEndTimer) {
      clearTimeout(this.scrollEndTimer)
    }

    this.scrollEndTimer = setTimeout(() => {
      this.scrolling = false
      this.scrollEndTimer = null

      this.onScrollEndCallback?.({
        type: 'scroll-end',
        scrollTop: this.scrollPosition.scrollTop,
        scrollLeft: this.scrollPosition.scrollLeft,
        timestamp: performance.now(),
      })
    }, this.scrollEndDelay)
  }

  /**
   * Get the current scroll position.
   *
   * @returns Current scroll position
   */
  getScrollPosition(): ScrollPosition {
    return { ...this.scrollPosition }
  }

  /**
   * Set the scroll position directly.
   *
   * @param position - New scroll position
   */
  setScrollPosition(position: Partial<ScrollPosition>): void {
    if (!this.container) return

    // Cancel any ongoing animation
    if (this.animationId) {
      cancelRaf(this.animationId)
      this.animationId = null
    }

    setScrollPosition(this.container, position)

    // Update our cached position
    if (position.scrollTop !== undefined) {
      this.scrollPosition.scrollTop = position.scrollTop
    }
    if (position.scrollLeft !== undefined) {
      this.scrollPosition.scrollLeft = position.scrollLeft
    }
  }

  /**
   * Scroll to an offset with optional animation.
   *
   * @param offset - Target scroll offset
   * @param options - Scroll options
   */
  scrollTo(offset: number, options: ScrollOptions = {}): void {
    if (!this.container) return

    const { behavior = 'auto', duration = 300, easing = easings.easeInOut } = options

    if (behavior === 'auto' || behavior === 'smooth' && duration === 0) {
      // Instant scroll
      this.setScrollPosition({ scrollTop: offset })
    } else {
      // Animated scroll
      this.animateScroll(offset, duration, easing)
    }
  }

  /**
   * Animate scroll to a target offset.
   */
  private animateScroll(targetOffset: number, duration: number, easing: EasingFunction): void {
    // Cancel any ongoing animation
    if (this.animationId) {
      cancelRaf(this.animationId)
    }

    this.animationStartTime = performance.now()
    this.animationStartOffset = this.scrollPosition.scrollTop
    this.animationTargetOffset = targetOffset
    this.animationDuration = duration
    this.animationEasing = easing

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - this.animationStartTime
      const progress = Math.min(elapsed / this.animationDuration, 1)
      const easedProgress = this.animationEasing(progress)

      const currentOffset =
        this.animationStartOffset +
        (this.animationTargetOffset - this.animationStartOffset) * easedProgress

      this.setScrollPosition({ scrollTop: currentOffset })

      if (progress < 1) {
        this.animationId = raf(animate)
      } else {
        this.animationId = null
      }
    }

    this.animationId = raf(animate)
  }

  /**
   * Check if currently scrolling.
   *
   * @returns Whether scrolling
   */
  isScrolling(): boolean {
    return this.scrolling
  }

  /**
   * Check if an animation is in progress.
   *
   * @returns Whether animating
   */
  isAnimating(): boolean {
    return this.animationId !== null
  }

  /**
   * Get the current scroll direction.
   *
   * @returns Scroll direction
   */
  getScrollDirection(): ScrollDirection {
    return this.scrollDirection
  }

  /**
   * Set scroll end delay.
   *
   * @param delay - Delay in ms
   */
  setScrollEndDelay(delay: number): void {
    this.scrollEndDelay = delay
  }

  /**
   * Set callback for scroll events.
   *
   * @param callback - Callback function
   */
  onScroll(callback: ScrollCallback | null): void {
    this.onScrollCallback = callback
  }

  /**
   * Set callback for scroll start events.
   *
   * @param callback - Callback function
   */
  onScrollStart(callback: ScrollStartCallback | null): void {
    this.onScrollStartCallback = callback
  }

  /**
   * Set callback for scroll end events.
   *
   * @param callback - Callback function
   */
  onScrollEnd(callback: ScrollEndCallback | null): void {
    this.onScrollEndCallback = callback
  }

  /**
   * Get the container element.
   *
   * @returns Container element, or null if not attached
   */
  getContainer(): HTMLElement | null {
    return this.container
  }

  /**
   * Check if attached to a container.
   *
   * @returns Whether attached
   */
  isAttached(): boolean {
    return this.container !== null
  }

  /**
   * Stop any ongoing scroll animation.
   */
  stopAnimation(): void {
    if (this.animationId) {
      cancelRaf(this.animationId)
      this.animationId = null
    }
  }
}
