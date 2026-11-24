import type {
  Plugin,
  Kernel,
  ScrollPosition,
  ScrollOptions,
  ScrollToIndexOptions,
  EasingFunction,
} from '../../types.js'
import { raf, cancelRaf } from '../../utils/raf.js'

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
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
} as const

/**
 * Scroll controller plugin options.
 */
export interface ScrollControllerOptions {
  /** Default scroll duration (ms) */
  defaultDuration?: number
  /** Default easing function */
  defaultEasing?: EasingFunction
}

/**
 * Scroll controller plugin API.
 */
export interface ScrollControllerAPI {
  /** Scroll to an offset */
  scrollTo(offset: number, options?: ScrollOptions): void
  /** Scroll to an item index */
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void
  /** Scroll to the top */
  scrollToTop(options?: ScrollOptions): void
  /** Scroll to the bottom */
  scrollToBottom(options?: ScrollOptions): void
  /** Get current scroll position */
  getScrollPosition(): ScrollPosition
  /** Check if currently scrolling */
  isScrolling(): boolean
  /** Check if animation is in progress */
  isAnimating(): boolean
  /** Stop current scroll animation */
  stopAnimation(): void
}

/**
 * Creates a scroll controller plugin.
 * Provides programmatic scroll control with smooth animations.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function scrollControllerPlugin(
  options: ScrollControllerOptions = {}
): Plugin {
  const {
    defaultDuration = 300,
    defaultEasing = easings.easeInOut,
  } = options

  let kernel: Kernel | null = null
  let animationId: number | null = null
  let animating = false
  // Bumped by stopAnimation: a frame that is already running when the animation is stopped must not continue it
  // (its own write can reach a host that reports the scroll synchronously and stops the animation)
  let animationGeneration = 0

  function isHorizontal(k: Kernel): boolean {
    return k.getOptions().direction === 'horizontal'
  }

  function getOffset(k: Kernel): number {
    const position = k.getScrollPosition()
    return isHorizontal(k) ? position.scrollLeft : position.scrollTop
  }

  // Write only the kernel's scroll axis; the other axis is left untouched
  function setOffset(k: Kernel, offset: number): void {
    k.setScrollPosition(isHorizontal(k) ? { scrollLeft: offset } : { scrollTop: offset })
  }

  function getViewportSize(k: Kernel): number {
    const viewport = k.getViewport()
    return isHorizontal(k) ? viewport.width : viewport.height
  }

  /**
   * Animate scroll to a target offset.
   */
  function animateScroll(
    targetOffset: number,
    duration: number,
    easing: EasingFunction
  ): void {
    if (!kernel) return

    // Stop any existing animation
    stopAnimation()
    const generation = animationGeneration

    const startTime = performance.now()
    const startOffset = getOffset(kernel)
    const distance = targetOffset - startOffset

    // If distance is 0 or the duration is zero, negative or NaN (it can't be animated), just set directly
    if (distance === 0 || !(duration > 0)) {
      setOffset(kernel, targetOffset)
      return
    }

    animating = true

    function animate(currentTime: number): void {
      if (!kernel) {
        animating = false
        return
      }
      // Stopped or replaced before this frame: the state belongs to the newer owner (or to no animation)
      if (generation !== animationGeneration) return

      const elapsed = currentTime - startTime
      // (a frame's timestamp is its start and can precede the performance.now() of the call that began the animation)
      const progress = Math.max(0, Math.min(elapsed / duration, 1))
      const easedProgress = easing(progress)
      const currentOffset = startOffset + distance * easedProgress

      setOffset(kernel, currentOffset)

      // Stopped (or superseded) by an observer of that write: do not schedule the next frame, and leave the
      // animation state to whoever stopped or replaced this animation
      if (generation !== animationGeneration) return

      if (progress < 1) {
        animationId = raf(animate)
      } else {
        animationId = null
        animating = false
      }
    }

    animationId = raf(animate)
  }

  /**
   * Stop the current animation.
   */
  function stopAnimation(): void {
    animationGeneration++
    if (animationId !== null) {
      cancelRaf(animationId)
      animationId = null
    }
    animating = false
  }

  const api: ScrollControllerAPI = {
    scrollTo(offset: number, options: ScrollOptions = {}): void {
      if (!kernel) return

      const {
        behavior = 'auto',
        duration = defaultDuration,
        easing = defaultEasing,
      } = options

      if (behavior === 'auto') {
        stopAnimation()
        setOffset(kernel, offset)
      } else {
        animateScroll(offset, duration, easing)
      }
    },

    scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
      if (!kernel) return

      const {
        align = 'auto',
        offset: additionalOffset = 0,
        ...scrollOptions
      } = options

      const itemOffset = kernel.getItemOffset(index)
      const itemSize = kernel.getCachedHeight(index) ?? kernel.getEstimatedHeight()
      const viewportSize = getViewportSize(kernel)

      let targetOffset: number

      switch (align) {
        case 'start':
          targetOffset = itemOffset
          break
        case 'center':
          targetOffset = itemOffset - viewportSize / 2 + itemSize / 2
          break
        case 'end':
          targetOffset = itemOffset - viewportSize + itemSize
          break
        case 'auto':
        default: {
          const visibleStart = getOffset(kernel)
          const visibleEnd = visibleStart + viewportSize
          const itemEnd = itemOffset + itemSize

          if (itemOffset < visibleStart) {
            // Item is above viewport - scroll to start
            targetOffset = itemOffset
          } else if (itemEnd > visibleEnd) {
            // Item is below viewport - scroll to show end
            targetOffset = itemEnd - viewportSize
          } else {
            // Item is already visible
            return
          }
          break
        }
      }

      // Clamp to valid range
      const maxScroll = Math.max(0, kernel.getTotalSize() - viewportSize)
      targetOffset = Math.max(0, Math.min(targetOffset + additionalOffset, maxScroll))

      api.scrollTo(targetOffset, scrollOptions)
    },

    scrollToTop(options: ScrollOptions = {}): void {
      api.scrollTo(0, options)
    },

    scrollToBottom(options: ScrollOptions = {}): void {
      if (!kernel) return

      const totalSize = kernel.getTotalSize()
      const maxScroll = Math.max(0, totalSize - getViewportSize(kernel))

      api.scrollTo(maxScroll, options)
    },

    getScrollPosition(): ScrollPosition {
      return kernel?.getScrollPosition() ?? { scrollTop: 0, scrollLeft: 0 }
    },

    isScrolling(): boolean {
      return kernel?.isScrolling() ?? false
    },

    isAnimating(): boolean {
      return animating
    },

    stopAnimation,
  }

  return {
    name: 'scroll-controller',
    version: '1.0.0',
    type: 'core',

    install(k: Kernel): void {
      kernel = k
    },

    uninstall(): void {
      stopAnimation()
      kernel = null
    },

    api,
  }
}
