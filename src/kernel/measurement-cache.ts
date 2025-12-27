/**
 * Cache for storing measured item heights.
 * Tracks measurements and calculates running averages.
 */
export class MeasurementCache {
  private cache: Map<number, number> = new Map()
  private estimatedHeight: number
  private totalMeasured = 0
  private sumOfHeights = 0

  /**
   * Create a new measurement cache.
   *
   * @param estimatedHeight - Default estimated height for unmeasured items
   */
  constructor(estimatedHeight: number) {
    this.estimatedHeight = estimatedHeight
  }

  /**
   * Get the cached height for an index.
   *
   * @param index - Item index
   * @returns Cached height, or undefined if not measured
   */
  get(index: number): number | undefined {
    return this.cache.get(index)
  }

  /**
   * Set the height for an index.
   *
   * @param index - Item index
   * @param height - Measured height
   * @returns Previous height, or undefined if not previously measured
   */
  set(index: number, height: number): number | undefined {
    const previousHeight = this.cache.get(index)

    if (previousHeight !== undefined) {
      // Update existing measurement
      this.sumOfHeights = this.sumOfHeights - previousHeight + height
    } else {
      // New measurement
      this.totalMeasured++
      this.sumOfHeights += height
    }

    this.cache.set(index, height)

    return previousHeight
  }

  /**
   * Check if an index has been measured.
   *
   * @param index - Item index
   * @returns Whether the index has a cached measurement
   */
  has(index: number): boolean {
    return this.cache.has(index)
  }

  /**
   * Delete a cached measurement.
   *
   * @param index - Item index
   * @returns Whether a measurement was deleted
   */
  delete(index: number): boolean {
    const height = this.cache.get(index)

    if (height !== undefined) {
      this.cache.delete(index)
      this.totalMeasured--
      this.sumOfHeights -= height
      return true
    }

    return false
  }

  /**
   * Clear all cached measurements.
   */
  clear(): void {
    this.cache.clear()
    this.totalMeasured = 0
    this.sumOfHeights = 0
  }

  /**
   * Get the height for an index, using estimated height if not measured.
   *
   * @param index - Item index
   * @returns Height (measured or estimated)
   */
  getOrEstimate(index: number): number {
    return this.cache.get(index) ?? this.getEstimatedHeight()
  }

  /**
   * Get the average height of measured items.
   * Falls back to estimated height if no measurements.
   *
   * @returns Average height
   */
  getAverageHeight(): number {
    if (this.totalMeasured === 0) {
      return this.estimatedHeight
    }

    return this.sumOfHeights / this.totalMeasured
  }

  /**
   * Get the estimated height.
   * Uses average of measured items if available, otherwise initial estimate.
   *
   * @returns Estimated height
   */
  getEstimatedHeight(): number {
    // Use average of measured items for better estimates
    if (this.totalMeasured > 0) {
      return this.getAverageHeight()
    }

    return this.estimatedHeight
  }

  /**
   * Set the base estimated height.
   *
   * @param height - New estimated height
   */
  setEstimatedHeight(height: number): void {
    this.estimatedHeight = height
  }

  /**
   * Get the number of measured items.
   *
   * @returns Number of measured items
   */
  getMeasuredCount(): number {
    return this.totalMeasured
  }

  /**
   * Get all measured indices.
   *
   * @returns Array of measured indices
   */
  getMeasuredIndices(): number[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get the total size (sum of all measured heights).
   *
   * @returns Total measured size
   */
  getTotalMeasuredSize(): number {
    return this.sumOfHeights
  }

  /**
   * Shift all indices by an offset.
   * Used when items are added or removed before the measured items.
   *
   * @param startIndex - Index from which to start shifting
   * @param offset - Amount to shift (positive = shift right, negative = shift left)
   */
  shiftIndices(startIndex: number, offset: number): void {
    if (offset === 0) return

    const newCache = new Map<number, number>()

    for (const [index, height] of this.cache) {
      if (index >= startIndex) {
        const newIndex = index + offset
        if (newIndex >= 0) {
          newCache.set(newIndex, height)
        } else {
          // Index shifted below 0, remove from totals
          this.totalMeasured--
          this.sumOfHeights -= height
        }
      } else {
        newCache.set(index, height)
      }
    }

    this.cache = newCache
  }

  /**
   * Get the internal cache map.
   * Useful for debugging or serialization.
   *
   * @returns The cache map
   */
  getCache(): Map<number, number> {
    return new Map(this.cache)
  }

  /**
   * Restore cache from a map.
   * Useful for deserialization or restoration.
   *
   * @param cache - Cache map to restore
   */
  restoreCache(cache: Map<number, number>): void {
    this.clear()

    for (const [index, height] of cache) {
      this.set(index, height)
    }
  }
}
