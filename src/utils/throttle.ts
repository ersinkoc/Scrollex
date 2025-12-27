/**
 * Creates a throttled version of a function that only executes at most once
 * per specified time interval.
 *
 * @param fn - Function to throttle
 * @param wait - Minimum time between invocations (ms)
 * @returns Throttled function with cancel method
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let lastTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    lastArgs = args

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastTime = now
      fn.apply(this, args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastTime = Date.now()
        timeoutId = null
        if (lastArgs) {
          fn.apply(this, lastArgs)
        }
      }, remaining)
    }
  } as T & { cancel: () => void }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
  }

  return throttled
}

/**
 * Creates a throttled version of a function using requestAnimationFrame.
 * Ensures the function is called at most once per frame (~16ms at 60fps).
 *
 * @param fn - Function to throttle
 * @returns Throttled function with cancel method
 */
export function throttleRAF<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T
): T & { cancel: () => void } {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (lastArgs) {
          fn.apply(this, lastArgs)
        }
      })
    }
  } as T & { cancel: () => void }

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    lastArgs = null
  }

  return throttled
}

/**
 * Creates a throttled function that executes on leading edge only.
 * The function will execute immediately and ignore subsequent calls
 * until the wait period has passed.
 *
 * @param fn - Function to throttle
 * @param wait - Minimum time between invocations (ms)
 * @returns Throttled function with cancel method
 */
export function throttleLeading<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let lastTime = 0

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastTime >= wait) {
      lastTime = now
      fn.apply(this, args)
    }
  } as T & { cancel: () => void }

  throttled.cancel = () => {
    lastTime = 0
  }

  return throttled
}
