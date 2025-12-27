/**
 * Create an array of numbers from start to end (exclusive).
 *
 * @param start - Start value (inclusive)
 * @param end - End value (exclusive)
 * @param step - Step size (default: 1)
 * @returns Array of numbers
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = []

  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i)
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i)
    }
  }

  return result
}

/**
 * Clamp a value between min and max.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Check if two values are approximately equal.
 *
 * @param a - First value
 * @param b - Second value
 * @param epsilon - Tolerance (default: 0.001)
 * @returns Whether values are approximately equal
 */
export function approximately(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon
}

/**
 * Linear interpolation between two values.
 *
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Inverse linear interpolation - find t given start, end, and value.
 *
 * @param start - Start value
 * @param end - End value
 * @param value - Value to find t for
 * @returns Interpolation factor (0-1)
 */
export function inverseLerp(start: number, end: number, value: number): number {
  if (start === end) return 0
  return (value - start) / (end - start)
}

/**
 * Remap a value from one range to another.
 *
 * @param value - Value to remap
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Remapped value
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = inverseLerp(inMin, inMax, value)
  return lerp(outMin, outMax, t)
}

/**
 * Get the sum of an array of numbers.
 *
 * @param arr - Array of numbers
 * @returns Sum of all numbers
 */
export function sum(arr: number[]): number {
  let total = 0
  for (const num of arr) {
    total += num
  }
  return total
}

/**
 * Get the average of an array of numbers.
 *
 * @param arr - Array of numbers
 * @returns Average value
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return sum(arr) / arr.length
}

/**
 * Create cumulative sum array from an array of values.
 *
 * @param arr - Array of numbers
 * @returns Cumulative sum array
 */
export function cumulativeSum(arr: number[]): number[] {
  const result: number[] = new Array(arr.length)
  let total = 0

  for (let i = 0; i < arr.length; i++) {
    total += arr[i] ?? 0
    result[i] = total
  }

  return result
}

/**
 * Move an item from one index to another in an array (immutably).
 *
 * @param arr - Array to modify
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with moved item
 */
export function moveItem<T>(arr: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...arr]

  const result = [...arr]
  const item = result[fromIndex]

  if (item === undefined) return result

  result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)

  return result
}

/**
 * Swap two items in an array (immutably).
 *
 * @param arr - Array to modify
 * @param indexA - First index
 * @param indexB - Second index
 * @returns New array with swapped items
 */
export function swapItems<T>(arr: readonly T[], indexA: number, indexB: number): T[] {
  if (indexA === indexB) return [...arr]

  const result = [...arr]
  const itemA = result[indexA]
  const itemB = result[indexB]

  if (itemA !== undefined && itemB !== undefined) {
    result[indexA] = itemB
    result[indexB] = itemA
  }

  return result
}

/**
 * Find the first index where a predicate returns true.
 * More efficient than findIndex for sorted arrays when using binary search elsewhere.
 *
 * @param arr - Array to search
 * @param predicate - Function to test each item
 * @returns Index of first match, or -1 if not found
 */
export function findFirstIndex<T>(
  arr: readonly T[],
  predicate: (item: T, index: number) => boolean
): number {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (item !== undefined && predicate(item, i)) {
      return i
    }
  }
  return -1
}

/**
 * Find the last index where a predicate returns true.
 *
 * @param arr - Array to search
 * @param predicate - Function to test each item
 * @returns Index of last match, or -1 if not found
 */
export function findLastIndex<T>(
  arr: readonly T[],
  predicate: (item: T, index: number) => boolean
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i]
    if (item !== undefined && predicate(item, i)) {
      return i
    }
  }
  return -1
}

/**
 * Create an array filled with a value from a factory function.
 *
 * @param length - Array length
 * @param factory - Function to create each item
 * @returns Filled array
 */
export function fill<T>(length: number, factory: (index: number) => T): T[] {
  const result: T[] = new Array(length)
  for (let i = 0; i < length; i++) {
    result[i] = factory(i)
  }
  return result
}
