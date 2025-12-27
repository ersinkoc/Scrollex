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

    const startTime = performance.now()
    const startOffset = kernel.getScrollPosition().scrollTop
    const distance = targetOffset - startOffset

    // If distance is 0 or duration is 0, just set directly
    if (distance === 0 || duration === 0) {
      kernel.setScrollPosition({ scrollTop: targetOffset, scrollLeft: 0 })
      return
    }

    animating = true

    function animate(currentTime: number): void {
      if (!kernel) {
        animating = false
        return
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      const currentOffset = startOffset + distance * easedProgress

      kernel.setScrollPosition({ scrollTop: currentOffset, scrollLeft: 0 })

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
        kernel.setScrollPosition({ scrollTop: offset, scrollLeft: 0 })
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
      const viewport = kernel.getViewport()

      let targetOffset: number

      switch (align) {
        case 'start':
          targetOffset = itemOffset
          break
        case 'center':
          targetOffset = itemOffset - viewport.height / 2 + itemSize / 2
          break
        case 'end':
          targetOffset = itemOffset - viewport.height + itemSize
          break
        case 'auto':
        default: {
          const scrollPosition = kernel.getScrollPosition()
          const visibleStart = scrollPosition.scrollTop
          const visibleEnd = visibleStart + viewport.height
          const itemEnd = itemOffset + itemSize

          if (itemOffset < visibleStart) {
            // Item is above viewport - scroll to start
            targetOffset = itemOffset
          } else if (itemEnd > visibleEnd) {
            // Item is below viewport - scroll to show end
            targetOffset = itemEnd - viewport.height
          } else {
            // Item is already visible
            return
          }
          break
        }
      }

      // Clamp to valid range
      const maxScroll = Math.max(0, kernel.getTotalSize() - viewport.height)
      targetOffset = Math.max(0, Math.min(targetOffset + additionalOffset, maxScroll))

      api.scrollTo(targetOffset, scrollOptions)
    },

    scrollToTop(options: ScrollOptions = {}): void {
      api.scrollTo(0, options)
    },

    scrollToBottom(options: ScrollOptions = {}): void {
      if (!kernel) return

      const viewport = kernel.getViewport()
      const totalSize = kernel.getTotalSize()
      const maxScroll = Math.max(0, totalSize - viewport.height)

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
