
import { MeasurementCache } from '../../src/kernel/measurement-cache.js'

describe('MeasurementCache', () => {
  describe('constructor', () => {
    it('should initialize with estimated height', () => {
      const cache = new MeasurementCache(50)
      expect(cache.getEstimatedHeight()).toBe(50)
    })
  })

  describe('get', () => {
    it('should return cached height', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      expect(cache.get(0)).toBe(100)
    })

    it('should return undefined for uncached index', () => {
      const cache = new MeasurementCache(50)

      expect(cache.get(0)).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should store height', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      expect(cache.get(0)).toBe(100)
    })

    it('should return previous height', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      const prev = cache.set(0, 150)

      expect(prev).toBe(100)
    })

    it('should return undefined for new measurement', () => {
      const cache = new MeasurementCache(50)

      const prev = cache.set(0, 100)

      expect(prev).toBeUndefined()
    })

    it('should update totals correctly on update', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 100)
      cache.set(0, 150)

      expect(cache.getTotalMeasuredSize()).toBe(250)
      expect(cache.getMeasuredCount()).toBe(2)
    })
  })

  describe('has', () => {
    it('should return true for measured index', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      expect(cache.has(0)).toBe(true)
    })

    it('should return false for unmeasured index', () => {
      const cache = new MeasurementCache(50)

      expect(cache.has(0)).toBe(false)
    })
  })

  describe('delete', () => {
    it('should remove cached measurement', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.delete(0)

      expect(cache.has(0)).toBe(false)
    })

    it('should return true when deleted', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      expect(cache.delete(0)).toBe(true)
    })

    it('should return false when nothing to delete', () => {
      const cache = new MeasurementCache(50)

      expect(cache.delete(0)).toBe(false)
    })

    it('should update totals on delete', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)
      cache.delete(0)

      expect(cache.getTotalMeasuredSize()).toBe(150)
      expect(cache.getMeasuredCount()).toBe(1)
    })
  })

  describe('clear', () => {
    it('should remove all measurements', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)
      cache.clear()

      expect(cache.has(0)).toBe(false)
      expect(cache.has(1)).toBe(false)
      expect(cache.getMeasuredCount()).toBe(0)
      expect(cache.getTotalMeasuredSize()).toBe(0)
    })
  })

  describe('getOrEstimate', () => {
    it('should return measured height when available', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)

      expect(cache.getOrEstimate(0)).toBe(100)
    })

    it('should return estimated height when not measured', () => {
      const cache = new MeasurementCache(50)

      expect(cache.getOrEstimate(0)).toBe(50)
    })

    it('should use average height as estimate when items measured', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 200)

      expect(cache.getOrEstimate(2)).toBe(150) // Average of 100 and 200
    })
  })

  describe('getAverageHeight', () => {
    it('should return average of measured heights', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 200)
      cache.set(2, 150)

      expect(cache.getAverageHeight()).toBe(150)
    })

    it('should return estimated height when no measurements', () => {
      const cache = new MeasurementCache(50)

      expect(cache.getAverageHeight()).toBe(50)
    })
  })

  describe('getEstimatedHeight', () => {
    it('should return initial estimate when no measurements', () => {
      const cache = new MeasurementCache(75)

      expect(cache.getEstimatedHeight()).toBe(75)
    })

    it('should return average when items measured', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 200)

      expect(cache.getEstimatedHeight()).toBe(150)
    })
  })

  describe('setEstimatedHeight', () => {
    it('should update base estimated height', () => {
      const cache = new MeasurementCache(50)
      cache.setEstimatedHeight(100)

      expect(cache.getEstimatedHeight()).toBe(100)
    })
  })

  describe('getMeasuredCount', () => {
    it('should return number of measured items', () => {
      const cache = new MeasurementCache(50)

      expect(cache.getMeasuredCount()).toBe(0)

      cache.set(0, 100)
      expect(cache.getMeasuredCount()).toBe(1)

      cache.set(1, 100)
      expect(cache.getMeasuredCount()).toBe(2)
    })
  })

  describe('getMeasuredIndices', () => {
    it('should return array of measured indices', () => {
      const cache = new MeasurementCache(50)
      cache.set(5, 100)
      cache.set(10, 100)
      cache.set(15, 100)

      const indices = cache.getMeasuredIndices()

      expect(indices).toContain(5)
      expect(indices).toContain(10)
      expect(indices).toContain(15)
      expect(indices).toHaveLength(3)
    })

    it('should return empty array when no measurements', () => {
      const cache = new MeasurementCache(50)

      expect(cache.getMeasuredIndices()).toEqual([])
    })
  })

  describe('getTotalMeasuredSize', () => {
    it('should return sum of all measured heights', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)
      cache.set(2, 200)

      expect(cache.getTotalMeasuredSize()).toBe(450)
    })

    it('should return 0 when no measurements', () => {
      const cache = new MeasurementCache(50)

      expect(cache.getTotalMeasuredSize()).toBe(0)
    })
  })

  describe('shiftIndices', () => {
    it('should shift indices forward', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)
      cache.set(2, 200)

      cache.shiftIndices(1, 2)

      expect(cache.get(0)).toBe(100) // Unchanged
      expect(cache.get(1)).toBeUndefined() // Shifted
      expect(cache.get(2)).toBeUndefined() // Shifted
      expect(cache.get(3)).toBe(150) // From index 1
      expect(cache.get(4)).toBe(200) // From index 2
    })

    it('should shift indices backward', () => {
      const cache = new MeasurementCache(50)
      cache.set(2, 100)
      cache.set(3, 150)
      cache.set(4, 200)

      cache.shiftIndices(2, -2)

      expect(cache.get(0)).toBe(100)
      expect(cache.get(1)).toBe(150)
      expect(cache.get(2)).toBe(200)
    })

    it('should remove items shifted below 0', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)
      cache.set(2, 200)

      cache.shiftIndices(0, -2)

      expect(cache.getMeasuredCount()).toBe(1)
      expect(cache.get(0)).toBe(200)
    })

    it('should do nothing for offset 0', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)

      cache.shiftIndices(0, 0)

      expect(cache.get(0)).toBe(100)
      expect(cache.get(1)).toBe(150)
    })
  })

  describe('getCache', () => {
    it('should return copy of cache', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 100)
      cache.set(1, 150)

      const copy = cache.getCache()

      expect(copy.get(0)).toBe(100)
      expect(copy.get(1)).toBe(150)

      // Should be a copy
      copy.set(2, 200)
      expect(cache.get(2)).toBeUndefined()
    })
  })

  describe('restoreCache', () => {
    it('should restore from map', () => {
      const cache = new MeasurementCache(50)
      const map = new Map([
        [0, 100],
        [1, 150],
        [2, 200],
      ])

      cache.restoreCache(map)

      expect(cache.get(0)).toBe(100)
      expect(cache.get(1)).toBe(150)
      expect(cache.get(2)).toBe(200)
      expect(cache.getMeasuredCount()).toBe(3)
      expect(cache.getTotalMeasuredSize()).toBe(450)
    })

    it('should clear existing cache before restore', () => {
      const cache = new MeasurementCache(50)
      cache.set(0, 999)

      cache.restoreCache(new Map([[1, 100]]))

      expect(cache.get(0)).toBeUndefined()
      expect(cache.get(1)).toBe(100)
      expect(cache.getMeasuredCount()).toBe(1)
    })
  })
})
