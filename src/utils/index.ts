// Binary search utilities
export {
  binarySearch,
  binarySearchClosest,
  binarySearchIndex,
  findStartIndex,
  findEndIndex,
} from './binary-search.js'

// Throttle utilities
export { throttle, throttleRAF, throttleLeading } from './throttle.js'

// Debounce utilities
export { debounce, debounceLeading, debounceBoth } from './debounce.js'

// RAF utilities
export {
  raf,
  cancelRaf,
  idle,
  cancelIdle,
  afterPaint,
  RAFBatcher,
  DOMBatcher,
} from './raf.js'

// Scroll utilities
export {
  getScrollPosition,
  setScrollPosition,
  smoothScrollTo,
  isScrollable,
  isScrollableX,
  isScrollableY,
  getMaxScroll,
  getScrollDirection,
  clampScrollPosition,
  isAtTop,
  isAtBottom,
  isAtLeft,
  isAtRight,
} from './scroll.js'

// Rect utilities
export {
  getBoundingRect,
  getContentRect,
  getScrollRect,
  getViewport,
  getOffset,
  getPadding,
  getBorder,
  rectsOverlap,
  rectContains,
  getIntersection,
  getVisibilityRatio,
} from './rect.js'

// Array utilities
export {
  range,
  clamp,
  approximately,
  lerp,
  inverseLerp,
  remap,
  sum,
  average,
  cumulativeSum,
  moveItem,
  swapItems,
  findFirstIndex,
  findLastIndex,
  fill,
} from './array.js'
