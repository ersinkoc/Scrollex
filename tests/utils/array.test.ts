
import {
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
} from '../../src/utils/array.js'

describe('range', () => {
  it('should create array from start to end', () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('should handle custom start', () => {
    expect(range(3, 7)).toEqual([3, 4, 5, 6])
  })

  it('should handle custom step', () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
  })

  it('should handle negative step', () => {
    expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1])
  })

  it('should return empty array for invalid range', () => {
    expect(range(5, 0)).toEqual([])
    expect(range(0, 5, -1)).toEqual([])
  })

  it('should return empty array for zero step', () => {
    expect(range(0, 5, 0)).toEqual([])
  })
})

describe('clamp', () => {
  it('should return value if within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('should return min if value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('should return max if value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('should handle negative ranges', () => {
    expect(clamp(-15, -10, -5)).toBe(-10)
    expect(clamp(-3, -10, -5)).toBe(-5)
  })

  it('should return value for edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('approximately', () => {
  it('should return true for equal values', () => {
    expect(approximately(5, 5)).toBe(true)
  })

  it('should return true for values within epsilon', () => {
    expect(approximately(5, 5.0001)).toBe(true)
    expect(approximately(5, 4.9999)).toBe(true)
  })

  it('should return false for values outside epsilon', () => {
    expect(approximately(5, 5.01)).toBe(false)
    expect(approximately(5, 4.99)).toBe(false)
  })

  it('should respect custom epsilon', () => {
    expect(approximately(5, 5.1, 0.2)).toBe(true)
    expect(approximately(5, 5.3, 0.2)).toBe(false)
  })
})

describe('lerp', () => {
  it('should return start at t=0', () => {
    expect(lerp(0, 100, 0)).toBe(0)
  })

  it('should return end at t=1', () => {
    expect(lerp(0, 100, 1)).toBe(100)
  })

  it('should interpolate at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })

  it('should extrapolate beyond 0-1 range', () => {
    expect(lerp(0, 100, 1.5)).toBe(150)
    expect(lerp(0, 100, -0.5)).toBe(-50)
  })

  it('should handle negative ranges', () => {
    expect(lerp(-100, 100, 0.5)).toBe(0)
  })
})

describe('inverseLerp', () => {
  it('should return 0 for start value', () => {
    expect(inverseLerp(0, 100, 0)).toBe(0)
  })

  it('should return 1 for end value', () => {
    expect(inverseLerp(0, 100, 100)).toBe(1)
  })

  it('should return 0.5 for middle value', () => {
    expect(inverseLerp(0, 100, 50)).toBe(0.5)
  })

  it('should return 0 for identical start and end', () => {
    expect(inverseLerp(50, 50, 50)).toBe(0)
  })

  it('should handle values outside range', () => {
    expect(inverseLerp(0, 100, 150)).toBe(1.5)
    expect(inverseLerp(0, 100, -50)).toBe(-0.5)
  })
})

describe('remap', () => {
  it('should remap value between ranges', () => {
    // 50 in 0-100 -> 5 in 0-10
    expect(remap(50, 0, 100, 0, 10)).toBe(5)
  })

  it('should handle different output range', () => {
    // 50 in 0-100 -> 550 in 500-600
    expect(remap(50, 0, 100, 500, 600)).toBe(550)
  })

  it('should handle inverted output range', () => {
    // 25 in 0-100 -> 75 in 100-0
    expect(remap(25, 0, 100, 100, 0)).toBe(75)
  })
})

describe('sum', () => {
  it('should sum array of numbers', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15)
  })

  it('should return 0 for empty array', () => {
    expect(sum([])).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(sum([-1, 2, -3, 4])).toBe(2)
  })

  it('should handle single element', () => {
    expect(sum([42])).toBe(42)
  })
})

describe('average', () => {
  it('should calculate average', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3)
  })

  it('should return 0 for empty array', () => {
    expect(average([])).toBe(0)
  })

  it('should handle single element', () => {
    expect(average([10])).toBe(10)
  })

  it('should handle decimals', () => {
    expect(average([1, 2])).toBe(1.5)
  })
})

describe('cumulativeSum', () => {
  it('should create cumulative sum array', () => {
    expect(cumulativeSum([1, 2, 3, 4, 5])).toEqual([1, 3, 6, 10, 15])
  })

  it('should return empty array for empty input', () => {
    expect(cumulativeSum([])).toEqual([])
  })

  it('should handle single element', () => {
    expect(cumulativeSum([5])).toEqual([5])
  })
})

describe('moveItem', () => {
  it('should move item forward', () => {
    expect(moveItem([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 3, 4, 2, 5])
  })

  it('should move item backward', () => {
    expect(moveItem([1, 2, 3, 4, 5], 3, 1)).toEqual([1, 4, 2, 3, 5])
  })

  it('should return copy when same index', () => {
    const arr = [1, 2, 3]
    const result = moveItem(arr, 1, 1)
    expect(result).toEqual([1, 2, 3])
    expect(result).not.toBe(arr)
  })

  it('should handle move to start', () => {
    expect(moveItem([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3])
  })

  it('should handle move to end', () => {
    expect(moveItem([1, 2, 3, 4], 0, 3)).toEqual([2, 3, 4, 1])
  })

  it('should not mutate original array', () => {
    const arr = [1, 2, 3]
    moveItem(arr, 0, 2)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('swapItems', () => {
  it('should swap two items', () => {
    expect(swapItems([1, 2, 3, 4], 0, 3)).toEqual([4, 2, 3, 1])
  })

  it('should return copy when same index', () => {
    const arr = [1, 2, 3]
    const result = swapItems(arr, 1, 1)
    expect(result).toEqual([1, 2, 3])
    expect(result).not.toBe(arr)
  })

  it('should handle adjacent items', () => {
    expect(swapItems([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
  })

  it('should not mutate original array', () => {
    const arr = [1, 2, 3]
    swapItems(arr, 0, 2)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('findFirstIndex', () => {
  it('should find first matching index', () => {
    expect(findFirstIndex([1, 2, 3, 4, 5], (x) => x > 2)).toBe(2)
  })

  it('should return -1 when no match', () => {
    expect(findFirstIndex([1, 2, 3], (x) => x > 10)).toBe(-1)
  })

  it('should return first match not last', () => {
    expect(findFirstIndex([1, 2, 3, 2, 1], (x) => x === 2)).toBe(1)
  })

  it('should handle empty array', () => {
    expect(findFirstIndex([], () => true)).toBe(-1)
  })

  it('should pass index to predicate', () => {
    expect(findFirstIndex([10, 20, 30], (_, i) => i === 1)).toBe(1)
  })
})

describe('findLastIndex', () => {
  it('should find last matching index', () => {
    expect(findLastIndex([1, 2, 3, 2, 1], (x) => x === 2)).toBe(3)
  })

  it('should return -1 when no match', () => {
    expect(findLastIndex([1, 2, 3], (x) => x > 10)).toBe(-1)
  })

  it('should handle empty array', () => {
    expect(findLastIndex([], () => true)).toBe(-1)
  })

  it('should pass index to predicate', () => {
    expect(findLastIndex([10, 20, 30], (_, i) => i < 2)).toBe(1)
  })
})

describe('fill', () => {
  it('should create array with factory values', () => {
    expect(fill(5, (i) => i * 2)).toEqual([0, 2, 4, 6, 8])
  })

  it('should handle zero length', () => {
    expect(fill(0, () => 1)).toEqual([])
  })

  it('should create constant array', () => {
    expect(fill(3, () => 'x')).toEqual(['x', 'x', 'x'])
  })

  it('should create objects', () => {
    const result = fill(2, (i) => ({ id: i }))
    expect(result).toEqual([{ id: 0 }, { id: 1 }])
  })
})
