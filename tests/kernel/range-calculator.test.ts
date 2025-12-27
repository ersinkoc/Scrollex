
import { RangeCalculator } from '../../src/kernel/range-calculator.js'

describe('RangeCalculator', () => {
  describe('constructor', () => {
    it('should initialize with options', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 3,
      })

      expect(calc.getItemCount()).toBe(100)
      expect(calc.getEstimatedHeight()).toBe(50)
    })

    it('should calculate initial total size', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getTotalSize()).toBe(1000)
    })
  })

  describe('getVisibleRange', () => {
    it('should return correct visible range', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      // Scroll position 0, viewport 200px (4 items)
      // Implementation uses exclusive end index
      const range = calc.getVisibleRange(0, 200)

      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(4) // exclusive: items 0,1,2,3
    })

    it('should include overscan items', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 2,
      })

      const range = calc.getVisibleRange(200, 200)

      // Visible: items 4-7 (scroll 200, viewport 200, item size 50)
      // Implementation uses exclusive end indices
      expect(range.startIndex).toBe(4)
      expect(range.endIndex).toBe(8) // exclusive: items 4,5,6,7
      expect(range.overscanStartIndex).toBe(2)
      expect(range.overscanEndIndex).toBe(10) // exclusive
    })

    it('should not exceed item count bounds', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 5,
      })

      const range = calc.getVisibleRange(400, 200)

      expect(range.overscanStartIndex).toBe(3)
      expect(range.overscanEndIndex).toBe(9)
    })

    it('should handle empty item list', () => {
      const calc = new RangeCalculator({
        itemCount: 0,
        estimatedItemHeight: 50,
        overscan: 2,
      })

      const range = calc.getVisibleRange(0, 200)

      expect(range).toEqual({
        startIndex: 0,
        endIndex: 0,
        overscanStartIndex: 0,
        overscanEndIndex: 0,
      })
    })

    it('should handle scroll at top', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 2,
      })

      const range = calc.getVisibleRange(0, 200)

      expect(range.startIndex).toBe(0)
      expect(range.overscanStartIndex).toBe(0)
    })

    it('should handle scroll at bottom', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      // Total size 1000, scroll to 800, viewport 200
      const range = calc.getVisibleRange(800, 200)

      expect(range.endIndex).toBe(9)
    })
  })

  describe('getItemOffset', () => {
    it('should return correct offset for index', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemOffset(0)).toBe(0)
      expect(calc.getItemOffset(1)).toBe(100)
      expect(calc.getItemOffset(5)).toBe(500)
    })

    it('should return 0 for negative index', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemOffset(-1)).toBe(0)
    })

    it('should return total size for index beyond count', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemOffset(100)).toBe(1000)
    })

    it('should account for measured heights', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemHeight(0, 200) // Double height

      // Note: MeasurementCache uses average of measured items for estimates
      // After setting item 0 to 200, unmeasured items estimate as 200 (the average)
      expect(calc.getItemOffset(0)).toBe(0)
      expect(calc.getItemOffset(1)).toBe(200)
      expect(calc.getItemOffset(2)).toBe(400) // 200 + 200 (avg estimate)
    })
  })

  describe('getItemEnd', () => {
    it('should return correct end position', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemEnd(0)).toBe(100)
      expect(calc.getItemEnd(1)).toBe(200)
    })
  })

  describe('getItemSize', () => {
    it('should return estimated height for unmeasured items', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      expect(calc.getItemSize(0)).toBe(50)
    })

    it('should return measured height when available', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      calc.setItemHeight(0, 75)

      expect(calc.getItemSize(0)).toBe(75)
    })
  })

  describe('getTotalSize', () => {
    it('should return total size with estimated heights', () => {
      const calc = new RangeCalculator({
        itemCount: 20,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      expect(calc.getTotalSize()).toBe(1000)
    })

    it('should update with measured heights', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemHeight(0, 200)

      // Note: MeasurementCache uses average of measured items for estimates
      // After setting item 0 to 200, the average is 200
      // Total = 200 (measured) + 9 * 200 (unmeasured using avg) = 2000
      expect(calc.getTotalSize()).toBe(2000)
    })
  })

  describe('setItemHeight', () => {
    it('should store and return previous height', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      expect(calc.setItemHeight(0, 100)).toBeUndefined()
      expect(calc.setItemHeight(0, 150)).toBe(100)
    })

    it('should invalidate offset cache from that index', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      // Get initial offset for index 5
      expect(calc.getItemOffset(5)).toBe(500)

      // Change height of item 2
      calc.setItemHeight(2, 200)

      // After measuring item 2 as 200:
      // - Items 0,1 keep their old cached offsets (built with estimate 100)
      // - Items 2+ are rebuilt with new avg estimate of 200
      // Offset for item 5: cached[1] (100) + size(1) (200) = 300 for item 2
      // Then: 300 + 200 + 200 + 200 = 900 for item 5
      expect(calc.getItemOffset(5)).toBe(900)
    })
  })

  describe('getCachedHeight', () => {
    it('should return undefined for unmeasured items', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      expect(calc.getCachedHeight(0)).toBeUndefined()
    })

    it('should return cached height when measured', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      calc.setItemHeight(0, 75)

      expect(calc.getCachedHeight(0)).toBe(75)
    })
  })

  describe('invalidate', () => {
    it('should remove cached measurement', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      calc.setItemHeight(0, 100)
      calc.invalidate(0)

      expect(calc.getCachedHeight(0)).toBeUndefined()
    })

    it('should recalculate offsets', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemHeight(0, 200)
      // After measuring item 0 as 200, unmeasured items use avg (200)
      // Offset(5) = 200*5 = 1000
      expect(calc.getItemOffset(5)).toBe(1000)

      calc.invalidate(0)
      // After invalidating, no measured items, reverts to estimatedItemHeight
      expect(calc.getItemOffset(5)).toBe(500)
    })
  })

  describe('invalidateAll', () => {
    it('should clear all measurements', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemHeight(0, 200)
      calc.setItemHeight(1, 150)
      calc.invalidateAll()

      expect(calc.getCachedHeight(0)).toBeUndefined()
      expect(calc.getCachedHeight(1)).toBeUndefined()
      expect(calc.getTotalSize()).toBe(1000)
    })
  })

  describe('setItemCount', () => {
    it('should update item count', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemCount(20)

      expect(calc.getItemCount()).toBe(20)
      expect(calc.getTotalSize()).toBe(2000)
    })

    it('should handle shrinking', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemCount(5)

      expect(calc.getItemCount()).toBe(5)
      // No measurements yet, so uses estimatedItemHeight
      expect(calc.getTotalSize()).toBe(500)
    })

    it('should preserve measurements for existing items', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemHeight(0, 200)
      calc.setItemCount(5)

      expect(calc.getCachedHeight(0)).toBe(200)
    })

    it('should do nothing for same count', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemCount(10)

      expect(calc.getItemCount()).toBe(10)
    })

    it('should set total size to 0 for count 0', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      calc.setItemCount(0)

      expect(calc.getTotalSize()).toBe(0)
    })
  })

  describe('setOverscan', () => {
    it('should update overscan value', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 2,
      })

      const range1 = calc.getVisibleRange(200, 200)
      expect(range1.overscanStartIndex).toBe(2)

      calc.setOverscan(5)

      const range2 = calc.getVisibleRange(200, 200)
      expect(range2.overscanStartIndex).toBe(0) // 4 - 5 = -1, clamped to 0
    })
  })

  describe('setEstimatedHeight', () => {
    it('should update estimated height', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      calc.setEstimatedHeight(100)

      expect(calc.getEstimatedHeight()).toBe(100)
      expect(calc.getTotalSize()).toBe(1000)
    })
  })

  describe('getItemAtOffset', () => {
    it('should return correct item index', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemAtOffset(0)).toBe(0)
      expect(calc.getItemAtOffset(50)).toBe(0)
      expect(calc.getItemAtOffset(100)).toBe(1)
      expect(calc.getItemAtOffset(550)).toBe(5)
    })

    it('should return 0 for negative offset', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemAtOffset(-100)).toBe(0)
    })

    it('should return last index for offset beyond total', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemAtOffset(5000)).toBe(9)
    })

    it('should return 0 for empty list', () => {
      const calc = new RangeCalculator({
        itemCount: 0,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      expect(calc.getItemAtOffset(100)).toBe(0)
    })
  })

  describe('getMeasurementCache', () => {
    it('should return measurement cache', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 50,
        overscan: 0,
      })

      const cache = calc.getMeasurementCache()

      expect(cache).toBeDefined()
      expect(cache.getEstimatedHeight()).toBe(50)
    })
  })
})
