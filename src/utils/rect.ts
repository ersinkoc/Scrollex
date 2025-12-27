import type { Viewport } from '../types.js'

/**
 * Get the bounding client rect of an element.
 * This is a wrapper that handles edge cases.
 *
 * @param element - Element to measure
 * @returns Bounding client rect
 */
export function getBoundingRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect()
}

/**
 * Get the content rect of an element (excluding padding, border, scrollbar).
 *
 * @param element - Element to measure
 * @returns Content dimensions
 */
export function getContentRect(element: HTMLElement): { width: number; height: number } {
  return {
    width: element.clientWidth,
    height: element.clientHeight,
  }
}

/**
 * Get the scroll dimensions of an element.
 *
 * @param element - Element to measure
 * @returns Scroll dimensions
 */
export function getScrollRect(element: HTMLElement): { width: number; height: number } {
  return {
    width: element.scrollWidth,
    height: element.scrollHeight,
  }
}

/**
 * Get complete viewport information from an element.
 *
 * @param element - Element to measure
 * @returns Viewport information
 */
export function getViewport(element: HTMLElement): Viewport {
  return {
    width: element.clientWidth,
    height: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
  }
}

/**
 * Get the offset of an element relative to its offset parent.
 *
 * @param element - Element to measure
 * @returns Offset position
 */
export function getOffset(element: HTMLElement): { top: number; left: number } {
  return {
    top: element.offsetTop,
    left: element.offsetLeft,
  }
}

/**
 * Get the computed padding of an element.
 *
 * @param element - Element to measure
 * @returns Padding values
 */
export function getPadding(element: HTMLElement): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const style = getComputedStyle(element)

  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  }
}

/**
 * Get the computed border width of an element.
 *
 * @param element - Element to measure
 * @returns Border widths
 */
export function getBorder(element: HTMLElement): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const style = getComputedStyle(element)

  return {
    top: parseFloat(style.borderTopWidth) || 0,
    right: parseFloat(style.borderRightWidth) || 0,
    bottom: parseFloat(style.borderBottomWidth) || 0,
    left: parseFloat(style.borderLeftWidth) || 0,
  }
}

/**
 * Check if two rects overlap.
 *
 * @param rect1 - First rect
 * @param rect2 - Second rect
 * @returns Whether the rects overlap
 */
export function rectsOverlap(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  )
}

/**
 * Check if a rect is fully contained within another rect.
 *
 * @param inner - Inner rect (potential child)
 * @param outer - Outer rect (potential parent)
 * @returns Whether inner is fully contained in outer
 */
export function rectContains(inner: DOMRect, outer: DOMRect): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  )
}

/**
 * Get the intersection area of two rects.
 *
 * @param rect1 - First rect
 * @param rect2 - Second rect
 * @returns Intersection rect, or null if no intersection
 */
export function getIntersection(rect1: DOMRect, rect2: DOMRect): DOMRect | null {
  const left = Math.max(rect1.left, rect2.left)
  const top = Math.max(rect1.top, rect2.top)
  const right = Math.min(rect1.right, rect2.right)
  const bottom = Math.min(rect1.bottom, rect2.bottom)

  if (left >= right || top >= bottom) {
    return null
  }

  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * Calculate what percentage of an item is visible within a viewport.
 *
 * @param itemStart - Start position of item
 * @param itemEnd - End position of item
 * @param viewportStart - Start position of viewport
 * @param viewportEnd - End position of viewport
 * @returns Visibility percentage (0-1)
 */
export function getVisibilityRatio(
  itemStart: number,
  itemEnd: number,
  viewportStart: number,
  viewportEnd: number
): number {
  const itemSize = itemEnd - itemStart
  if (itemSize <= 0) return 0

  const visibleStart = Math.max(itemStart, viewportStart)
  const visibleEnd = Math.min(itemEnd, viewportEnd)
  const visibleSize = Math.max(0, visibleEnd - visibleStart)

  return visibleSize / itemSize
}
