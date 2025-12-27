
import {
  binarySearch,
  binarySearchClosest,
  binarySearchIndex,
  findStartIndex,
  findEndIndex,
} from '../../src/utils/binary-search.js'

describe('binarySearch', () => {
  it('should find the first index where predicate is true', () => {
    // Array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    // Find first index >= 5
    const result = binarySearch(10, (index) => index >= 5)
    expect(result).toBe(5)
  })

  it('should return 0 when predicate is true for all elements', () => {
    const result = binarySearch(10, () => true)
    expect(result).toBe(0)
  })

  it('should return length when predicate is false for all elements', () => {
    const result = binarySearch(10, () => false)
    expect(result).toBe(10)
  })

  it('should handle single element array', () => {
    expect(binarySearch(1, () => true)).toBe(0)
    expect(binarySearch(1, () => false)).toBe(1)
  })

  it('should handle empty array', () => {
    const result = binarySearch(0, () => true)
    expect(result).toBe(0)
  })

  it('should find correct index for middle element', () => {
    // Find first even number >= 6 in [0,1,2,3,4,5,6,7,8,9]
    const result = binarySearch(10, (index) => index >= 3)
    expect(result).toBe(3)
  })

  it('should work with accumulated heights', () => {
    const heights = [100, 50, 75, 80, 90]
    const offsets = [0, 100, 150, 225, 305]

    // Find first item with offset >= 150
    const result = binarySearch(heights.length, (index) => offsets[index]! >= 150)
    expect(result).toBe(2)
  })
})

describe('binarySearchClosest', () => {
  it('should find the index where accumulated value >= target', () => {
    const values = [100, 200, 300, 400, 500]
    const result = binarySearchClosest(5, (index) => values[index]!, 250)
    expect(result).toBe(2)
  })

  it('should return 0 for empty array', () => {
    const result = binarySearchClosest(0, () => 0, 100)
    expect(result).toBe(0)
  })

  it('should return 0 when target is less than first value', () => {
    const values = [100, 200, 300]
    const result = binarySearchClosest(3, (index) => values[index]!, 50)
    expect(result).toBe(0)
  })

  it('should return last index when target exceeds all values', () => {
    const values = [100, 200, 300]
    const result = binarySearchClosest(3, (index) => values[index]!, 500)
    expect(result).toBe(2)
  })

  it('should find exact match', () => {
    const values = [100, 200, 300, 400, 500]
    const result = binarySearchClosest(5, (index) => values[index]!, 300)
    expect(result).toBe(2)
  })

  it('should handle single element', () => {
    const values = [100]
    expect(binarySearchClosest(1, () => values[0]!, 50)).toBe(0)
    expect(binarySearchClosest(1, () => values[0]!, 150)).toBe(0)
  })
})

describe('binarySearchIndex', () => {
  it('should find exact match', () => {
    const values = [10, 20, 30, 40, 50]
    const result = binarySearchIndex(5, (index) => 30 - values[index]!)
    expect(result).toBe(2)
  })

  it('should return insertion point when not found', () => {
    const values = [10, 20, 40, 50]
    // Looking for 30, should return 2 (where it would be inserted)
    const result = binarySearchIndex(4, (index) => {
      if (values[index]! < 30) return -1
      if (values[index]! > 30) return 1
      return 0
    })
    expect(result).toBe(2)
  })

  it('should return 0 for empty array', () => {
    const result = binarySearchIndex(0, () => 0)
    expect(result).toBe(0)
  })

  it('should return 0 when target is smaller than all', () => {
    const values = [10, 20, 30]
    const result = binarySearchIndex(3, (index) => {
      if (values[index]! < 5) return -1
      if (values[index]! > 5) return 1
      return 0
    })
    expect(result).toBe(0)
  })

  it('should return length when target is larger than all', () => {
    const values = [10, 20, 30]
    const result = binarySearchIndex(3, (index) => {
      if (values[index]! < 40) return -1
      if (values[index]! > 40) return 1
      return 0
    })
    expect(result).toBe(3)
  })
})

describe('findStartIndex', () => {
  it('should find first visible item', () => {
    const heights = [100, 100, 100, 100, 100]
    const getOffset = (index: number) => index * 100
    const getSize = () => 100

    // Scrolled to 250, first visible is index 2 (offset 200-300)
    const result = findStartIndex(250, getOffset, getSize, 5)
    expect(result).toBe(2)
  })

  it('should return 0 for empty array', () => {
    const result = findStartIndex(100, () => 0, () => 100, 0)
    expect(result).toBe(0)
  })

  it('should return 0 when scrolled to top', () => {
    const result = findStartIndex(0, (i) => i * 100, () => 100, 5)
    expect(result).toBe(0)
  })

  it('should handle variable item sizes', () => {
    const heights = [50, 100, 150, 75, 125]
    const offsets = [0, 50, 150, 300, 375]

    const result = findStartIndex(
      160,
      (index) => offsets[index]!,
      (index) => heights[index]!,
      5
    )
    expect(result).toBe(2) // Item at offset 150 with height 150
  })

  it('should find last item when scrolled to end', () => {
    const heights = [100, 100, 100]
    const result = findStartIndex(
      200,
      (i) => i * 100,
      () => 100,
      3
    )
    expect(result).toBe(2)
  })
})

describe('findEndIndex', () => {
  it('should find last visible item', () => {
    const getOffset = (index: number) => index * 100

    // Viewport: 0-300, items at 0,100,200,300,400
    // Items 0,1,2 are visible (offsets 0,100,200 < 300)
    // Implementation returns exclusive end index
    const result = findEndIndex(0, 300, getOffset, 5)
    expect(result).toBe(3) // exclusive: items 0,1,2
  })

  it('should return 0 for empty array', () => {
    const result = findEndIndex(0, 300, () => 0, 0)
    expect(result).toBe(0)
  })

  it('should return last index when viewport covers all', () => {
    const result = findEndIndex(0, 1000, (i) => i * 100, 5)
    expect(result).toBe(4)
  })

  it('should start search from startIndex', () => {
    const getOffset = (index: number) => index * 100

    // Start from index 2, viewport 200-500
    // Items 2,3,4 are visible (offsets 200,300,400 < 500)
    // Implementation returns exclusive end index
    const result = findEndIndex(200, 300, getOffset, 10, 2)
    expect(result).toBe(5) // exclusive: items 2,3,4
  })

  it('should handle small viewport', () => {
    // Viewport 50-100, items at 0,100,200...
    // Item 0 (at offset 0) is visible
    // Implementation returns exclusive end index
    const result = findEndIndex(50, 50, (i) => i * 100, 10)
    expect(result).toBe(1) // exclusive: only item 0
  })

  it('should handle scrolled past all items', () => {
    const result = findEndIndex(1000, 300, (i) => i * 100, 5)
    expect(result).toBe(4)
  })
})
