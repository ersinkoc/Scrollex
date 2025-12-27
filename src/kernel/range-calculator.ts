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
 * Maintains an offset cache for efficient lookups.
 */
export class RangeCalculator {
  private itemCount: number
  private overscan: number
  private measurementCache: MeasurementCache
  private offsetCache: number[] = []
  private dirtyFromIndex = 0
  private totalSize = 0

  /**
   * Create a new range calculator.
   *
   * @param options - Configuration options
   */
  constructor(options: RangeCalculatorOptions) {
    this.itemCount = options.itemCount
    this.overscan = options.overscan
    this.measurementCache = new MeasurementCache(options.estimatedItemHeight)
    this.rebuildOffsetCache()
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

    // Ensure offset cache is up to date
    this.ensureOffsetCacheValid(this.itemCount - 1)

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
    if (scrollEnd >= this.totalSize) return this.itemCount - 1

    // Linear search from start index is often faster for small ranges
    let index = startIndex
    while (index < this.itemCount - 1) {
      const itemStart = this.getItemOffset(index)
      if (itemStart >= scrollEnd) {
        break
      }
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
    if (index >= this.itemCount) return this.totalSize

    this.ensureOffsetCacheValid(index)
    return this.offsetCache[index] ?? 0
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
    this.ensureOffsetCacheValid(this.itemCount - 1)
    return this.totalSize
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

    // Mark offset cache as dirty from this index
    this.invalidateFrom(index)

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
    if (this.measurementCache.delete(index)) {
      this.invalidateFrom(index)
    }
  }

  /**
   * Invalidate all measurements.
   */
  invalidateAll(): void {
    this.measurementCache.clear()
    this.dirtyFromIndex = 0
    this.rebuildOffsetCache()
  }

  /**
   * Mark offset cache as dirty from a specific index.
   */
  private invalidateFrom(index: number): void {
    this.dirtyFromIndex = Math.min(this.dirtyFromIndex, index)
  }

  /**
   * Ensure offset cache is valid up to the given index.
   */
  private ensureOffsetCacheValid(upToIndex: number): void {
    if (this.dirtyFromIndex > upToIndex) return

    // Rebuild dirty portion
    let offset = this.dirtyFromIndex === 0 ? 0 : (this.offsetCache[this.dirtyFromIndex - 1] ?? 0) + this.getItemSize(this.dirtyFromIndex - 1)

    for (let i = this.dirtyFromIndex; i <= upToIndex && i < this.itemCount; i++) {
      this.offsetCache[i] = offset
      offset += this.getItemSize(i)
    }

    // Update total size if we reached the end
    if (upToIndex >= this.itemCount - 1) {
      this.totalSize = offset
    }

    this.dirtyFromIndex = upToIndex + 1
  }

  /**
   * Rebuild the entire offset cache.
   */
  private rebuildOffsetCache(): void {
    this.offsetCache = new Array(this.itemCount)
    this.dirtyFromIndex = 0

    if (this.itemCount > 0) {
      this.ensureOffsetCacheValid(this.itemCount - 1)
    } else {
      this.totalSize = 0
    }
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
      // Shrinking - truncate cache and recalculate total size
      this.offsetCache.length = count
      // Force recalculation of totalSize by calculating it directly
      if (count > 0) {
        // Use the last item's offset + size to get totalSize
        const lastIndex = count - 1
        // Ensure cache is valid up to the last item
        this.dirtyFromIndex = Math.min(this.dirtyFromIndex, lastIndex)
        this.ensureOffsetCacheValid(lastIndex)
      } else {
        this.totalSize = 0
      }
    } else {
      // Growing - extend cache
      this.offsetCache.length = count
      // Mark new items as dirty
      if (this.dirtyFromIndex > previousCount) {
        this.dirtyFromIndex = previousCount
      }
    }
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
    this.measurementCache.setEstimatedHeight(height)
    // Invalidate all unmeasured items
    this.dirtyFromIndex = 0
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
    if (offset >= this.totalSize) return this.itemCount - 1

    this.ensureOffsetCacheValid(this.itemCount - 1)

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
}
