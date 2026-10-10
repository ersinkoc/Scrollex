import type { Range } from '../types.js'
import { binarySearch } from '../utils/binary-search.js'
import { clamp } from '../utils/array.js'
import { MeasurementCache } from './measurement-cache.js'

/**
 * Options for the range calculator.
 */
export interface RangeCalculatorOptions {
  itemCount: number
  estimatedItemHeight: number
  overscan: number
}

/**
 * Calculates the visible range of items using binary search.
 *
 * Unmeasured items are sized with the average of the measured ones, so one new measurement moves every
 * later offset. Offsets are therefore not stored per item: the measured items live in two Fenwick trees
 * (how many there are, and their total height before an index) and
 *
 *   offset(i) = measuredHeightBefore(i) + (i - measuredCountBefore(i)) * unmeasuredSize
 *
 * so a measurement costs O(log n) instead of a walk over the whole list.
 */
export class RangeCalculator {
  private itemCount: number
  private overscan: number
  private measurementCache: MeasurementCache

  // Fenwick trees (1-based) over the measured items with index < itemCount
  private countTree: Float64Array = new Float64Array(1)
  private sumTree: Float64Array = new Float64Array(1)
  private treesValid = false

  /**
   * Create a new range calculator.
   *
   * @param options - Configuration options
   */
  constructor(options: RangeCalculatorOptions) {
    this.itemCount = options.itemCount
    this.overscan = options.overscan
    this.measurementCache = new MeasurementCache(options.estimatedItemHeight)
  }

  /**
   * Get the visible range of items.
   *
   * @param scrollOffset - Current scroll position
   * @param viewportSize - Size of the visible viewport
   * @returns Visible range with overscan
   */
  getVisibleRange(scrollOffset: number, viewportSize: number): Range {
    if (this.itemCount === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        overscanStartIndex: 0,
        overscanEndIndex: 0,
      }
    }

    // Find start index using binary search
    const startIndex = this.findStartIndex(scrollOffset)

    // Find end index
    const scrollEnd = scrollOffset + viewportSize
    const endIndex = this.findEndIndex(scrollEnd, startIndex)

    // Apply overscan
    const overscanStartIndex = Math.max(0, startIndex - this.overscan)
    const overscanEndIndex = Math.min(this.itemCount - 1, endIndex + this.overscan)

    return {
      startIndex,
      endIndex,
      overscanStartIndex,
      overscanEndIndex,
    }
  }

  /**
   * Find the start index for a given scroll offset.
   */
  private findStartIndex(scrollOffset: number): number {
    if (scrollOffset <= 0) return 0

    const index = binarySearch(this.itemCount, (mid) => {
      const itemEnd = this.getItemEnd(mid)
      return itemEnd > scrollOffset
    })

    return clamp(index, 0, this.itemCount - 1)
  }

  /**
   * Find the end index for a given scroll end position.
   */
  private findEndIndex(scrollEnd: number, startIndex: number): number {
    if (scrollEnd >= this.getTotalSize()) return this.itemCount - 1

    // Linear search from start index is often faster for small ranges: the last item that starts
    // before the end of the viewport is the last one that is at least partly inside it
    let index = startIndex
    while (index < this.itemCount - 1 && this.getItemOffset(index + 1) < scrollEnd) {
      index++
    }

    return clamp(index, startIndex, this.itemCount - 1)
  }

  /**
   * Get the offset (start position) of an item.
   *
   * @param index - Item index
   * @returns Offset from start
   */
  getItemOffset(index: number): number {
    if (index < 0 || this.itemCount === 0) return 0
    if (index >= this.itemCount) return this.getTotalSize()

    return this.offsetBefore(Math.floor(index))
  }

  /**
   * Get the end position of an item.
   *
   * @param index - Item index
   * @returns End position (offset + size)
   */
  getItemEnd(index: number): number {
    return this.getItemOffset(index) + this.getItemSize(index)
  }

  /**
   * Get the size of an item.
   *
   * @param index - Item index
   * @returns Item size
   */
  getItemSize(index: number): number {
    return this.measurementCache.getOrEstimate(index)
  }

  /**
   * Get the total size of all items.
   *
   * @returns Total size
   */
  getTotalSize(): number {
    return this.offsetBefore(this.itemCount)
  }

  /**
   * Set the height for an item.
   *
   * @param index - Item index
   * @param height - Item height
   * @returns Previous height, or undefined if not measured
   */
  setItemHeight(index: number, height: number): number | undefined {
    const previousHeight = this.measurementCache.set(index, height)
    this.track(index, previousHeight === undefined ? 1 : 0, height - (previousHeight ?? 0))

    return previousHeight
  }

  /**
   * Get the cached height for an item.
   *
   * @param index - Item index
   * @returns Cached height, or undefined if not measured
   */
  getCachedHeight(index: number): number | undefined {
    return this.measurementCache.get(index)
  }

  /**
   * Invalidate measurement for an item.
   *
   * @param index - Item index
   */
  invalidate(index: number): void {
    const previousHeight = this.measurementCache.get(index)
    if (this.measurementCache.delete(index)) {
      this.track(index, -1, -(previousHeight ?? 0))
    }
  }

  /**
   * Invalidate all measurements.
   */
  invalidateAll(): void {
    this.measurementCache.clear()
    this.treesValid = false
  }

  /**
   * Update item count.
   *
   * @param count - New item count
   */
  setItemCount(count: number): void {
    if (count === this.itemCount) return

    const previousCount = this.itemCount
    this.itemCount = count

    if (count < previousCount) {
      // Shrinking - the removed items take their measurements with them (they would keep feeding the
      // average that sizes unmeasured items, and come back for other items if the list grows again)
      for (const measured of this.measurementCache.getMeasuredIndices()) {
        if (measured >= count) this.measurementCache.delete(measured)
      }
    }

    this.treesValid = false
  }

  /**
   * Update overscan amount.
   *
   * @param overscan - New overscan value
   */
  setOverscan(overscan: number): void {
    this.overscan = overscan
  }

  /**
   * Update estimated item height.
   *
   * @param height - New estimated height
   */
  setEstimatedHeight(height: number): void {
    // Unmeasured items are sized from it: offsets are computed from the current value on every query
    this.measurementCache.setEstimatedHeight(height)
  }

  /**
   * Get the estimated item height.
   *
   * @returns Estimated height
   */
  getEstimatedHeight(): number {
    return this.measurementCache.getEstimatedHeight()
  }

  /**
   * Get the item index at a given offset.
   *
   * @param offset - Offset position
   * @returns Item index at that offset
   */
  getItemAtOffset(offset: number): number {
    if (offset <= 0 || this.itemCount === 0) return 0
    if (offset >= this.getTotalSize()) return this.itemCount - 1

    return binarySearch(this.itemCount, (mid) => {
      const itemEnd = this.getItemEnd(mid)
      return itemEnd > offset
    })
  }

  /**
   * Get the measurement cache.
   *
   * @returns Measurement cache
   */
  getMeasurementCache(): MeasurementCache {
    return this.measurementCache
  }

  /**
   * Get current item count.
   *
   * @returns Item count
   */
  getItemCount(): number {
    return this.itemCount
  }

  /**
   * Position where item `index` starts (index === itemCount gives the total size).
   */
  private offsetBefore(index: number): number {
    this.ensureTrees()

    let measuredCount = 0
    let measuredSum = 0
    for (let i = index; i > 0; i -= i & -i) {
      measuredCount += this.countTree[i]!
      measuredSum += this.sumTree[i]!
    }

    return measuredSum + (index - measuredCount) * this.measurementCache.getEstimatedHeight()
  }

  /**
   * Record that the measured set changed at `index` (a no-op until the trees are built).
   */
  private track(index: number, countDelta: number, sumDelta: number): void {
    if (!this.treesValid || index < 0 || index >= this.itemCount || !Number.isInteger(index)) return

    for (let i = index + 1; i <= this.itemCount; i += i & -i) {
      this.countTree[i]! += countDelta
      this.sumTree[i]! += sumDelta
    }
  }

  /**
   * Build the Fenwick trees from the measurement cache (linear time).
   */
  private ensureTrees(): void {
    if (this.treesValid) return

    const size = this.itemCount
    this.countTree = new Float64Array(size + 1)
    this.sumTree = new Float64Array(size + 1)

    for (const index of this.measurementCache.getMeasuredIndices()) {
      if (index < 0 || index >= size || !Number.isInteger(index)) continue
      this.countTree[index + 1] = 1
      this.sumTree[index + 1] = this.measurementCache.get(index) ?? 0
    }

    for (let i = 1; i <= size; i++) {
      const parent = i + (i & -i)
      if (parent <= size) {
        this.countTree[parent]! += this.countTree[i]!
        this.sumTree[parent]! += this.sumTree[i]!
      }
    }

    this.treesValid = true
  }
}
