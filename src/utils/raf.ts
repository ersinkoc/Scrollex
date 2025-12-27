/**
 * Cross-browser requestAnimationFrame wrapper.
 * Falls back to setTimeout if RAF is not available.
 *
 * @param callback - Function to call on next frame
 * @returns Request ID for cancellation
 */
export function raf(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback)
  }
  return setTimeout(() => callback(Date.now()), 16) as unknown as number
}

/**
 * Cross-browser cancelAnimationFrame wrapper.
 *
 * @param id - Request ID to cancel
 */
export function cancelRaf(id: number): void {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * requestIdleCallback with fallback for browsers that don't support it.
 *
 * @param callback - Function to call during idle time
 * @param options - Options including timeout
 * @returns Request ID for cancellation
 */
export function idle(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, options)
  }

  // Fallback implementation using setTimeout
  const timeout = options?.timeout ?? 50
  const start = Date.now()

  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, timeout - (Date.now() - start)),
    })
  }, 1) as unknown as number
}

/**
 * Cancel an idle callback.
 *
 * @param id - Request ID to cancel
 */
export function cancelIdle(id: number): void {
  if (typeof cancelIdleCallback !== 'undefined') {
    cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Schedule a callback to run after the next paint.
 * Uses double RAF to ensure the callback runs after the browser has painted.
 *
 * @param callback - Function to call after paint
 * @returns Cancel function
 */
export function afterPaint(callback: () => void): () => void {
  let id1: number | null = null
  let id2: number | null = null

  id1 = raf(() => {
    id2 = raf(callback)
  })

  return () => {
    if (id1 !== null) cancelRaf(id1)
    if (id2 !== null) cancelRaf(id2)
  }
}

/**
 * Batches multiple RAF requests into a single frame.
 * Useful for grouping multiple updates to reduce layout thrashing.
 */
export class RAFBatcher {
  private callbacks: Set<() => void> = new Set()
  private scheduled = false
  private rafId: number | null = null

  /**
   * Schedule a callback to run in the next animation frame.
   * Multiple calls before the frame will be batched together.
   *
   * @param callback - Function to call
   */
  schedule(callback: () => void): void {
    this.callbacks.add(callback)

    if (!this.scheduled) {
      this.scheduled = true
      this.rafId = raf(() => {
        this.flush()
      })
    }
  }

  /**
   * Execute all pending callbacks immediately.
   */
  flush(): void {
    this.scheduled = false
    this.rafId = null

    const callbacks = Array.from(this.callbacks)
    this.callbacks.clear()

    for (const callback of callbacks) {
      callback()
    }
  }

  /**
   * Cancel all pending callbacks.
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelRaf(this.rafId)
      this.rafId = null
    }
    this.scheduled = false
    this.callbacks.clear()
  }
}

/**
 * Creates a function that batches DOM reads and writes to avoid layout thrashing.
 * Reads are executed first, then writes, all in a single animation frame.
 */
export class DOMBatcher {
  private reads: (() => void)[] = []
  private writes: (() => void)[] = []
  private scheduled = false
  private rafId: number | null = null

  /**
   * Schedule a DOM read operation.
   *
   * @param callback - Function that reads from the DOM
   */
  read(callback: () => void): void {
    this.reads.push(callback)
    this.schedule()
  }

  /**
   * Schedule a DOM write operation.
   *
   * @param callback - Function that writes to the DOM
   */
  write(callback: () => void): void {
    this.writes.push(callback)
    this.schedule()
  }

  private schedule(): void {
    if (!this.scheduled) {
      this.scheduled = true
      this.rafId = raf(() => {
        this.flush()
      })
    }
  }

  /**
   * Execute all pending reads and writes immediately.
   */
  flush(): void {
    this.scheduled = false
    this.rafId = null

    // Execute all reads first
    const reads = this.reads.splice(0)
    for (const read of reads) {
      read()
    }

    // Then execute all writes
    const writes = this.writes.splice(0)
    for (const write of writes) {
      write()
    }
  }

  /**
   * Cancel all pending operations.
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelRaf(this.rafId)
      this.rafId = null
    }
    this.scheduled = false
    this.reads = []
    this.writes = []
  }
}
