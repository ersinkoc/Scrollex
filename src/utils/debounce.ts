/**
 * Creates a debounced version of a function that delays execution until
 * after the specified wait time has elapsed since the last call.
 *
 * @param fn - Function to debounce
 * @param wait - Time to wait before executing (ms)
 * @returns Debounced function with cancel and flush methods
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: unknown = null

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (lastArgs) {
        fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
      }
    }, wait)
  } as T & { cancel: () => void; flush: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
    lastThis = null
  }

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      if (lastArgs) {
        fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
      }
    }
  }

  return debounced
}

/**
 * Creates a debounced function with leading edge execution.
 * The function executes immediately on the first call, then waits
 * for the specified time before allowing another execution.
 *
 * @param fn - Function to debounce
 * @param wait - Time to wait before allowing next execution (ms)
 * @returns Debounced function with cancel method
 */
export function debounceLeading<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let canExecute = true

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    if (canExecute) {
      canExecute = false
      fn.apply(this, args)
    }

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      canExecute = true
      timeoutId = null
    }, wait)
  } as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    canExecute = true
  }

  return debounced
}

/**
 * Creates a debounced function with both leading and trailing edge execution.
 * The function executes immediately on the first call and also after the wait
 * period if there were additional calls.
 *
 * @param fn - Function to debounce
 * @param wait - Time to wait (ms)
 * @returns Debounced function with cancel and flush methods
 */
export function debounceBoth<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  wait: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: unknown = null
  let isLeading = true

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this

    if (isLeading) {
      isLeading = false
      fn.apply(this, args)
    }

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      isLeading = true
      if (lastArgs) {
        fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
      }
    }, wait)
  } as T & { cancel: () => void; flush: () => void }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
    lastThis = null
    isLeading = true
  }

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      if (lastArgs) {
        fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
      }
    }
    isLeading = true
  }

  return debounced
}
