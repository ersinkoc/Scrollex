import type { Plugin, Kernel } from '../../types.js'
import { debounce } from '../../utils/debounce.js'

/**
 * Auto measurer plugin options.
 */
export interface AutoMeasurerOptions {
  /** Estimated item height for initial layout */
  estimatedItemHeight?: number
  /** Whether to re-measure when item content resizes */
  measureOnResize?: boolean
  /** Debounce time for resize measurements (ms) */
  debounceMs?: number
}

/**
 * Auto measurer plugin API.
 */
export interface AutoMeasurerAPI {
  /** Measure an element and update cache */
  measureElement(index: number, element: HTMLElement): number
  /** Get cached size for an index */
  getCachedSize(index: number): number | undefined
  /** Invalidate measurement for an index */
  invalidate(index: number): void
  /** Invalidate all measurements */
  invalidateAll(): void
  /** Get the measurement cache */
  getMeasurementCache(): Map<number, number>
  /** Observe an element for size changes */
  observe(index: number, element: HTMLElement): void
  /** Stop observing an element */
  unobserve(element: HTMLElement): void
}

/**
 * Creates an auto measurer plugin.
 * Handles automatic measurement of variable height items.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function autoMeasurerPlugin(options: AutoMeasurerOptions = {}): Plugin {
  const {
    estimatedItemHeight = 50,
    measureOnResize = true,
    debounceMs = 100,
  } = options

  let kernel: Kernel | null = null
  let resizeObserver: ResizeObserver | null = null
  const observedElements = new WeakMap<Element, number>()
  const elementsByIndex = new Map<number, WeakRef<HTMLElement>>()
  let measureQueue = new Set<number>()
  let flushScheduled = false

  /**
   * Create debounced flush function.
   */
  const debouncedFlush = debounce(() => {
    flush()
  }, debounceMs)

  /**
   * Flush pending measurements.
   */
  function flush(): void {
    if (!kernel || measureQueue.size === 0) {
      flushScheduled = false
      return
    }

    const indicesToMeasure = Array.from(measureQueue)
    measureQueue = new Set()
    flushScheduled = false

    // Batch read all dimensions
    const measurements: Array<{ index: number; height: number }> = []

    for (const index of indicesToMeasure) {
      const ref = elementsByIndex.get(index)
      const element = ref?.deref()

      if (element) {
        const rect = element.getBoundingClientRect()
        measurements.push({ index, height: rect.height })
      }
    }

    // Batch update kernel
    for (const { index, height } of measurements) {
      if (height > 0) {
        kernel.measureItem(index, height)
      }
    }
  }

  /**
   * Schedule a flush of pending measurements.
   */
  function scheduleFlush(): void {
    if (!flushScheduled) {
      flushScheduled = true
      requestAnimationFrame(() => {
        flush()
      })
    }
  }

  /**
   * Handle resize observer callback.
   */
  function handleResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const index = observedElements.get(entry.target)

      if (index !== undefined) {
        measureQueue.add(index)
      }
    }

    if (measureOnResize && measureQueue.size > 0) {
      debouncedFlush()
    }
  }

  const api: AutoMeasurerAPI = {
    measureElement(index: number, element: HTMLElement): number {
      const rect = element.getBoundingClientRect()
      const height = rect.height

      if (height > 0 && kernel) {
        kernel.measureItem(index, height)
      }

      return height
    },

    getCachedSize(index: number): number | undefined {
      return kernel?.getCachedHeight(index)
    },

    invalidate(index: number): void {
      kernel?.invalidateMeasurement(index)
    },

    invalidateAll(): void {
      kernel?.invalidateAllMeasurements()
    },

    getMeasurementCache(): Map<number, number> {
      const cache = new Map<number, number>()
      if (!kernel) return cache

      const itemCount = kernel.getItemCount()
      for (let i = 0; i < itemCount; i++) {
        const height = kernel.getCachedHeight(i)
        if (height !== undefined) {
          cache.set(i, height)
        }
      }

      return cache
    },

    observe(index: number, element: HTMLElement): void {
      if (!resizeObserver) return

      // Clean up any previous element at this index
      const existingRef = elementsByIndex.get(index)
      const existingElement = existingRef?.deref()
      if (existingElement && existingElement !== element) {
        resizeObserver.unobserve(existingElement)
        observedElements.delete(existingElement)
      }

      // Store the new element
      observedElements.set(element, index)
      elementsByIndex.set(index, new WeakRef(element))

      // Start observing
      resizeObserver.observe(element)

      // Initial measurement
      measureQueue.add(index)
      scheduleFlush()
    },

    unobserve(element: HTMLElement): void {
      if (!resizeObserver) return

      const index = observedElements.get(element)
      if (index !== undefined) {
        resizeObserver.unobserve(element)
        observedElements.delete(element)
        elementsByIndex.delete(index)
        measureQueue.delete(index)
      }
    },
  }

  return {
    name: 'auto-measurer',
    version: '1.0.0',
    type: 'core',

    install(k: Kernel): void {
      kernel = k

      // Set estimated height
      kernel.configure({ estimatedItemHeight })

      // Create ResizeObserver for dynamic measurement
      if (measureOnResize && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize)
      }
    },

    uninstall(): void {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }

      debouncedFlush.cancel()
      measureQueue.clear()
      elementsByIndex.clear()
      flushScheduled = false
      kernel = null
    },

    api,
  }
}
