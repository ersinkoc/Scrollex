/**
 * Binary search to find the index of the first item that satisfies the predicate.
 * The predicate should return true for all items at and after the target index.
 *
 * @param length - Number of items to search through
 * @param predicate - Function that returns true when item is at or after target
 * @returns The index of the first item where predicate returns true
 */
export function binarySearch(
  length: number,
  predicate: (index: number) => boolean
): number {
  let low = 0
  let high = length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)

    if (predicate(mid)) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return low
}

/**
 * Binary search to find the closest index where the accumulated value is >= target.
 *
 * @param length - Number of items
 * @param getAccumulatedValue - Function to get accumulated value at index
 * @param target - Target value to find
 * @returns The index where accumulated value is >= target
 */
export function binarySearchClosest(
  length: number,
  getAccumulatedValue: (index: number) => number,
  target: number
): number {
  if (length === 0) return 0

  let low = 0
  let high = length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const value = getAccumulatedValue(mid)

    if (value < target) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

/**
 * Binary search to find the index of an item by comparing with a target value.
 * Returns the index where the item would be inserted to maintain sorted order.
 *
 * @param length - Number of items
 * @param compare - Function that returns negative if item < target, 0 if equal, positive if >
 * @returns The index where the item should be
 */
export function binarySearchIndex(
  length: number,
  compare: (index: number) => number
): number {
  let low = 0
  let high = length

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const cmp = compare(mid)

    if (cmp < 0) {
      low = mid + 1
    } else if (cmp > 0) {
      high = mid
    } else {
      return mid
    }
  }

  return low
}

/**
 * Find the start index given a scroll offset and item offsets.
 *
 * @param scrollOffset - Current scroll position
 * @param getItemOffset - Function to get offset of item at index
 * @param getItemSize - Function to get size of item at index
 * @param itemCount - Total number of items
 * @returns Index of the first visible item
 */
export function findStartIndex(
  scrollOffset: number,
  getItemOffset: (index: number) => number,
  getItemSize: (index: number) => number,
  itemCount: number
): number {
  if (itemCount === 0) return 0

  return binarySearch(itemCount, (index) => {
    const offset = getItemOffset(index)
    const size = getItemSize(index)
    return offset + size > scrollOffset
  })
}

/**
 * Find the end index given a scroll offset, viewport size, and item offsets.
 *
 * @param scrollOffset - Current scroll position
 * @param viewportSize - Size of the visible viewport
 * @param getItemOffset - Function to get offset of item at index
 * @param itemCount - Total number of items
 * @param startIndex - Starting index to search from
 * @returns Index of the last visible item
 */
export function findEndIndex(
  scrollOffset: number,
  viewportSize: number,
  getItemOffset: (index: number) => number,
  itemCount: number,
  startIndex: number = 0
): number {
  if (itemCount === 0) return 0

  const scrollEnd = scrollOffset + viewportSize

  // Start search from startIndex for efficiency
  let index = startIndex

  while (index < itemCount && getItemOffset(index) < scrollEnd) {
    index++
  }

  // Return the last item that's at least partially visible
  return Math.min(index, itemCount - 1)
}
