import type { ScrollPosition, ScrollDirection } from '../types.js'

/**
 * Get the scroll position of an element.
 *
 * @param element - Element to get scroll position from
 * @returns Scroll position object
 */
export function getScrollPosition(element: HTMLElement): ScrollPosition {
  return {
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
  }
}

/**
 * Set the scroll position of an element.
 *
 * @param element - Element to scroll
 * @param position - Scroll position to set
 */
export function setScrollPosition(
  element: HTMLElement,
  position: Partial<ScrollPosition>
): void {
  if (position.scrollTop !== undefined) {
    element.scrollTop = position.scrollTop
  }
  if (position.scrollLeft !== undefined) {
    element.scrollLeft = position.scrollLeft
  }
}

/**
 * Smooth scroll to a position using the native scrollTo API.
 *
 * @param element - Element to scroll
 * @param position - Target scroll position
 */
export function smoothScrollTo(
  element: HTMLElement,
  position: Partial<ScrollPosition>
): void {
  element.scrollTo({
    top: position.scrollTop,
    left: position.scrollLeft,
    behavior: 'smooth',
  })
}

/**
 * Check if an element is scrollable (has overflow set to scroll or auto).
 *
 * @param element - Element to check
 * @returns Whether the element is scrollable
 */
export function isScrollable(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  const overflowY = style.overflowY
  const overflowX = style.overflowX

  return (
    overflowY === 'auto' ||
    overflowY === 'scroll' ||
    overflowX === 'auto' ||
    overflowX === 'scroll'
  )
}

/**
 * Check if an element is scrollable vertically.
 *
 * @param element - Element to check
 * @returns Whether the element is vertically scrollable
 */
export function isScrollableY(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  const overflowY = style.overflowY
  return (
    (overflowY === 'auto' || overflowY === 'scroll') &&
    element.scrollHeight > element.clientHeight
  )
}

/**
 * Check if an element is scrollable horizontally.
 *
 * @param element - Element to check
 * @returns Whether the element is horizontally scrollable
 */
export function isScrollableX(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  const overflowX = style.overflowX
  return (
    (overflowX === 'auto' || overflowX === 'scroll') &&
    element.scrollWidth > element.clientWidth
  )
}

/**
 * Get the maximum scroll position of an element.
 *
 * @param element - Element to check
 * @returns Maximum scroll position
 */
export function getMaxScroll(element: HTMLElement): ScrollPosition {
  return {
    scrollTop: Math.max(0, element.scrollHeight - element.clientHeight),
    scrollLeft: Math.max(0, element.scrollWidth - element.clientWidth),
  }
}

/**
 * Determine scroll direction from position changes.
 *
 * @param current - Current scroll position
 * @param previous - Previous scroll position
 * @returns Scroll direction
 */
export function getScrollDirection(
  current: ScrollPosition,
  previous: ScrollPosition
): ScrollDirection {
  const deltaY = current.scrollTop - previous.scrollTop
  const deltaX = current.scrollLeft - previous.scrollLeft

  // Prioritize vertical direction
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    if (deltaY > 0) return 'down'
    if (deltaY < 0) return 'up'
  } else {
    if (deltaX > 0) return 'right'
    if (deltaX < 0) return 'left'
  }

  return 'none'
}

/**
 * Clamp a scroll position to valid bounds.
 *
 * @param position - Position to clamp
 * @param element - Element to get bounds from
 * @returns Clamped position
 */
export function clampScrollPosition(
  position: ScrollPosition,
  element: HTMLElement
): ScrollPosition {
  const maxScroll = getMaxScroll(element)

  return {
    scrollTop: Math.max(0, Math.min(position.scrollTop, maxScroll.scrollTop)),
    scrollLeft: Math.max(0, Math.min(position.scrollLeft, maxScroll.scrollLeft)),
  }
}

/**
 * Check if scroll position is at the top.
 *
 * @param element - Element to check
 * @param threshold - Threshold in pixels
 * @returns Whether scroll is at top
 */
export function isAtTop(element: HTMLElement, threshold = 0): boolean {
  return element.scrollTop <= threshold
}

/**
 * Check if scroll position is at the bottom.
 *
 * @param element - Element to check
 * @param threshold - Threshold in pixels
 * @returns Whether scroll is at bottom
 */
export function isAtBottom(element: HTMLElement, threshold = 0): boolean {
  const maxScroll = element.scrollHeight - element.clientHeight
  return element.scrollTop >= maxScroll - threshold
}

/**
 * Check if scroll position is at the left.
 *
 * @param element - Element to check
 * @param threshold - Threshold in pixels
 * @returns Whether scroll is at left
 */
export function isAtLeft(element: HTMLElement, threshold = 0): boolean {
  return element.scrollLeft <= threshold
}

/**
 * Check if scroll position is at the right.
 *
 * @param element - Element to check
 * @param threshold - Threshold in pixels
 * @returns Whether scroll is at right
 */
export function isAtRight(element: HTMLElement, threshold = 0): boolean {
  const maxScroll = element.scrollWidth - element.clientWidth
  return element.scrollLeft >= maxScroll - threshold
}
