
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
      const range = calc.getVisibleRange(0, 200)

      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(3) // inclusive: items 0,1,2,3
    })

    it('should include overscan items', () => {
      const calc = new RangeCalculator({
        itemCount: 100,
        estimatedItemHeight: 50,
        overscan: 2,
      })

      const range = calc.getVisibleRange(200, 200)

      // Visible: items 4-7 (scroll 200, viewport 200, item size 50)
      expect(range.startIndex).toBe(4)
      expect(range.endIndex).toBe(7) // inclusive: items 4,5,6,7
      expect(range.overscanStartIndex).toBe(2)
      expect(range.overscanEndIndex).toBe(9)
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

    it('should invalidate offset cache when the estimate changes', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })

      // Get initial offset for index 5
      expect(calc.getItemOffset(5)).toBe(500)

      // Change height of item 2
      calc.setItemHeight(2, 200)

      // The average of the measured items (200) now sizes every unmeasured item, before and after
      // item 2, so items 0..4 are 200 each and offsets stay contiguous: 5 * 200
      expect(calc.getItemOffset(5)).toBe(1000)
      expect(calc.getItemOffset(1)).toBe(200)
    })

    it('should keep earlier offsets when the estimate does not change', () => {
      const calc = new RangeCalculator({
        itemCount: 10,
        estimatedItemHeight: 100,
        overscan: 0,
      })
      calc.setItemHeight(0, 100)
      expect(calc.getItemOffset(5)).toBe(500)

      // Measuring at the current estimate changes nothing before the index
      calc.setItemHeight(2, 100)
      expect(calc.getItemOffset(1)).toBe(100)
      expect(calc.getItemOffset(5)).toBe(500)

      // A different height for a measured item shifts what follows it only
      calc.setItemHeight(0, 100)
      calc.invalidate(2)
      expect(calc.getItemOffset(5)).toBe(500)
    })

    it('should keep offsets contiguous after measurements in any order', () => {
      const calc = new RangeCalculator({ itemCount: 30, estimatedItemHeight: 50, overscan: 0 })
      calc.getTotalSize()
      for (const [index, height] of [[20, 200], [3, 30], [29, 90], [10, 70], [0, 120]] as const) {
        calc.setItemHeight(index, height)
      }
      calc.invalidate(20)

      for (let i = 1; i < calc.getItemCount(); i++) {
        expect(calc.getItemOffset(i)).toBeCloseTo(calc.getItemOffset(i - 1) + calc.getItemSize(i - 1), 9)
      }
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

describe('RangeCalculator when the item count shrinks', () => {
  it('should drop the measurements of the removed items and size the rest from what is left', () => {
    const calc = new RangeCalculator({ itemCount: 100, estimatedItemHeight: 50, overscan: 0 })
    for (let i = 90; i < 100; i++) calc.setItemHeight(i, 200)

    calc.setItemCount(20)

    expect(calc.getTotalSize()).toBe(1000)
    expect(calc.getMeasurementCache().getMeasuredCount()).toBe(0)
  })

  it('should not bring the measurements back when the list grows again', () => {
    const calc = new RangeCalculator({ itemCount: 100, estimatedItemHeight: 50, overscan: 0 })
    calc.setItemHeight(95, 200)

    calc.setItemCount(20)
    calc.setItemCount(100)

    expect(calc.getCachedHeight(95)).toBeUndefined()
    expect(calc.getTotalSize()).toBe(5000)
  })

  it('should keep the measurements below the new count and follow the new average', () => {
    const calc = new RangeCalculator({ itemCount: 100, estimatedItemHeight: 50, overscan: 0 })
    calc.setItemHeight(2, 100)
    calc.setItemHeight(5, 300)
    for (let i = 60; i < 70; i++) calc.setItemHeight(i, 1000)

    calc.setItemCount(10)

    expect(calc.getCachedHeight(2)).toBe(100)
    expect(calc.getCachedHeight(5)).toBe(300)
    expect(calc.getTotalSize()).toBe(100 + 300 + 8 * 200)
  })

  it('should handle shrinking to nothing', () => {
    const calc = new RangeCalculator({ itemCount: 30, estimatedItemHeight: 40, overscan: 0 })
    calc.setItemHeight(29, 500)

    calc.setItemCount(0)

    expect(calc.getTotalSize()).toBe(0)
    expect(calc.getCachedHeight(29)).toBeUndefined()
  })
})

describe('RangeCalculator endIndex', () => {
  it('should be the last item that is at least partly inside the viewport', () => {
    const calc = new RangeCalculator({ itemCount: 100, estimatedItemHeight: 50, overscan: 0 })

    expect(calc.getVisibleRange(0, 500).endIndex).toBe(9) // item 10 starts exactly at the edge
    expect(calc.getVisibleRange(25, 500).endIndex).toBe(10)
    expect(calc.getVisibleRange(4500, 500)).toMatchObject({ startIndex: 90, endIndex: 99 })
  })

  it('should match a brute-force search over mixed heights, offsets and viewport sizes', () => {
    let seed = 7
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

    for (let round = 0; round < 100; round++) {
      const count = 1 + Math.floor(random() * 80)
      const calc = new RangeCalculator({ itemCount: count, estimatedItemHeight: 30, overscan: 0 })
      const heights: number[] = []
      for (let i = 0; i < count; i++) { const h = 10 + Math.floor(random() * 90); heights.push(h); calc.setItemHeight(i, h) }
      const starts = heights.map((_, i) => heights.slice(0, i).reduce((a, b) => a + b, 0))
      const total = starts[count - 1]! + heights[count - 1]!

      for (let k = 0; k < 10; k++) {
        const offset = Math.floor(random() * total)
        const size = 1 + Math.floor(random() * 300)
        const visible = heights.map((_, i) => i).filter((i) => starts[i]! + heights[i]! > offset && starts[i]! < offset + size)
        const range = calc.getVisibleRange(offset, size)

        expect([range.startIndex, range.endIndex]).toEqual([visible[0], visible[visible.length - 1]])
      }
    }
  })

  it('should put the overscan around the inclusive range', () => {
    const calc = new RangeCalculator({ itemCount: 100, estimatedItemHeight: 50, overscan: 3 })

    expect(calc.getVisibleRange(200, 200)).toEqual({ startIndex: 4, endIndex: 7, overscanStartIndex: 1, overscanEndIndex: 10 })
  })
})

describe('RangeCalculator measurement cost and consistency', () => {
  it('should not walk the whole list when an item is measured', () => {
    const touched = (itemCount: number) => {
      const calc = new RangeCalculator({ itemCount, estimatedItemHeight: 50, overscan: 5 })
      calc.getTotalSize()
      const cache = calc.getMeasurementCache()
      const original = cache.getOrEstimate.bind(cache)
      let lookups = 0
      cache.getOrEstimate = (index: number) => { lookups++; return original(index) }
      for (let i = 0; i < 20; i++) {
        calc.setItemHeight(i, 40 + i)
        calc.getVisibleRange(0, 600)
        calc.getTotalSize()
      }
      return lookups
    }

    expect(touched(100_000)).toBeLessThanOrEqual(touched(10_000) * 2 + 1000)
  })

  // 2,400 operation rounds with per-index assertions: CPU-bound, and it passed vitest's 5s default only when the file
  // ran alone
  it('should answer like a plain recomputation after random operations', { timeout: 30_000 }, () => {
    let seed = 11
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

    for (let round = 0; round < 60; round++) {
      let count = Math.floor(random() * 120)
      const base = 20 + Math.floor(random() * 80)
      const calc = new RangeCalculator({ itemCount: count, estimatedItemHeight: base, overscan: 0 })
      const measured = new Map<number, number>()
      let estimate = base

      for (let step = 0; step < 40; step++) {
        const op = random()
        if (op < 0.5 && count > 0) {
          const index = Math.floor(random() * count)
          const height = 5 + Math.floor(random() * 150)
          calc.setItemHeight(index, height)
          measured.set(index, height)
        } else if (op < 0.65 && count > 0) {
          const index = Math.floor(random() * count)
          calc.invalidate(index)
          measured.delete(index)
        } else if (op < 0.7) {
          calc.invalidateAll()
          measured.clear()
        } else if (op < 0.9) {
          count = Math.max(0, count + Math.floor((random() - 0.5) * 80))
          calc.setItemCount(count)
          for (const index of [...measured.keys()]) if (index >= count) measured.delete(index)
        } else {
          estimate = 10 + Math.floor(random() * 90)
          calc.setEstimatedHeight(estimate)
        }

        const unmeasured = measured.size > 0 ? [...measured.values()].reduce((a, b) => a + b, 0) / measured.size : estimate
        let offset = 0
        for (let i = 0; i < count; i++) {
          expect(calc.getItemOffset(i)).toBeCloseTo(offset, 6)
          offset += measured.get(i) ?? unmeasured
        }
        expect(calc.getTotalSize()).toBeCloseTo(offset, 6)
      }
    }
  })
})
