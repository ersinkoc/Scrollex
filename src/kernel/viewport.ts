import type { Viewport, ResizeEvent } from '../types.js'
import { throttleRAF } from '../utils/throttle.js'
import { getViewport as getViewportRect } from '../utils/rect.js'

/**
 * Callback for viewport changes.
 */
export type ViewportChangeCallback = (event: ResizeEvent) => void

/**
 * Manages viewport dimensions and resize detection.
 */
export class ViewportManager {
  private viewport: Viewport = {
    width: 0,
    height: 0,
    scrollWidth: 0,
    scrollHeight: 0,
  }
  private container: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private onChangeCallback: ViewportChangeCallback | null = null
  private throttledHandleResize: ReturnType<typeof throttleRAF> | null = null

  /**
   * Attach to a container element.
   *
   * @param container - Container element to observe
   */
  attach(container: HTMLElement): void {
    this.detach()

    this.container = container
    this.viewport = getViewportRect(container)

    // Create throttled resize handler
    this.throttledHandleResize = throttleRAF(this.handleResize.bind(this))

    // Set up ResizeObserver
    this.resizeObserver = new ResizeObserver(this.throttledHandleResize)
    this.resizeObserver.observe(container)
  }

  /**
   * Detach from the current container.
   */
  detach(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.throttledHandleResize) {
      this.throttledHandleResize.cancel()
      this.throttledHandleResize = null
    }

    this.container = null
  }

  /**
   * Handle resize observer callback.
   */
  private handleResize(): void {
    if (!this.container) return

    const previousViewport = { ...this.viewport }
    this.viewport = getViewportRect(this.container)

    // Check if dimensions actually changed
    if (
      previousViewport.width === this.viewport.width &&
      previousViewport.height === this.viewport.height &&
      previousViewport.scrollWidth === this.viewport.scrollWidth &&
      previousViewport.scrollHeight === this.viewport.scrollHeight
    ) {
      return
    }

    if (this.onChangeCallback) {
      this.onChangeCallback({
        type: 'resize',
        viewport: this.viewport,
        previousViewport,
      })
    }
  }

  /**
   * Get the current viewport dimensions.
   *
   * @returns Current viewport
   */
  getViewport(): Viewport {
    return { ...this.viewport }
  }

  /**
   * Force a measurement update.
   *
   * @returns Updated viewport
   */
  measure(): Viewport {
    if (this.container) {
      const previousViewport = { ...this.viewport }
      this.viewport = getViewportRect(this.container)

      // Emit change if dimensions changed
      if (
        (previousViewport.width !== this.viewport.width ||
          previousViewport.height !== this.viewport.height ||
          previousViewport.scrollWidth !== this.viewport.scrollWidth ||
          previousViewport.scrollHeight !== this.viewport.scrollHeight) &&
        this.onChangeCallback
      ) {
        this.onChangeCallback({
          type: 'resize',
          viewport: this.viewport,
          previousViewport,
        })
      }
    }

    return { ...this.viewport }
  }

  /**
   * Update the scroll dimensions without triggering a resize event.
   * Used when the content size changes but container size stays the same.
   *
   * @param scrollWidth - New scroll width
   * @param scrollHeight - New scroll height
   */
  updateScrollDimensions(scrollWidth: number, scrollHeight: number): void {
    this.viewport.scrollWidth = scrollWidth
    this.viewport.scrollHeight = scrollHeight
  }

  /**
   * Set callback for viewport changes.
   *
   * @param callback - Callback function
   */
  onChange(callback: ViewportChangeCallback | null): void {
    this.onChangeCallback = callback
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
   * Get the visible width.
   *
   * @returns Visible width
   */
  getWidth(): number {
    return this.viewport.width
  }

  /**
   * Get the visible height.
   *
   * @returns Visible height
   */
  getHeight(): number {
    return this.viewport.height
  }

  /**
   * Get the total scrollable width.
   *
   * @returns Scroll width
   */
  getScrollWidth(): number {
    return this.viewport.scrollWidth
  }

  /**
   * Get the total scrollable height.
   *
   * @returns Scroll height
   */
  getScrollHeight(): number {
    return this.viewport.scrollHeight
  }
}
