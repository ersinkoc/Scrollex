import { useCallback, useRef, useEffect, useState } from 'react'

/**
 * Options for useMeasure hook.
 */
export interface UseMeasureOptions {
  /** Callback when size changes */
  onResize?: (width: number, height: number) => void
  /** Whether to debounce resize callbacks */
  debounce?: number
}

/**
 * Return type for useMeasure hook.
 */
export interface UseMeasureReturn {
  /** Ref to attach to the element */
  measureRef: React.RefCallback<HTMLElement>
  /** Current width */
  width: number
  /** Current height */
  height: number
}

/**
 * The size an observer entry reports. The first reading of an element is its border box (getBoundingClientRect),
 * so later reports use the border box as well: contentRect leaves out padding and border and the value would jump.
 */
function boxOf(entry: ResizeObserverEntry): { width: number; height: number } {
  const borderBox = entry.borderBoxSize?.[0]
  if (borderBox && (borderBox.inlineSize > 0 || borderBox.blockSize > 0)) {
    return { width: borderBox.inlineSize, height: borderBox.blockSize }
  }
  return { width: entry.contentRect.width, height: entry.contentRect.height }
}

/**
 * Hook for measuring an element's dimensions.
 * Uses ResizeObserver to track size changes.
 *
 * @param options - Hook configuration
 * @returns Measure ref and dimensions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { measureRef, width, height } = useMeasure()
 *
 *   return (
 *     <div ref={measureRef}>
 *       Size: {width} x {height}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMeasure(options: UseMeasureOptions = {}): UseMeasureReturn {
  const { onResize, debounce = 0 } = options

  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Latest onResize; read via ref so an inline callback does not re-create the observer each render
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize

  // Handle resize
  const handleResize = useCallback(
    (width: number, height: number) => {
      setDimensions((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height }
      )

      const onResize = onResizeRef.current
      if (onResize) {
        if (debounce > 0) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = setTimeout(() => {
            onResize(width, height)
          }, debounce)
        } else {
          onResize(width, height)
        }
      }
    },
    [debounce]
  )

  // Create observer
  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = boxOf(entry)
        handleResize(width, height)
      }
    })

    // Observe current element if exists: on the first commit the ref callback ran before this effect created the
    // observer, so it neither observed nor measured the element
    if (elementRef.current) {
      // (measured before observing: a report delivered on observe() is newer than this first reading)
      const rect = elementRef.current.getBoundingClientRect()
      handleResize(rect.width, rect.height)
      observerRef.current.observe(elementRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [handleResize])

  // Ref callback
  const measureRef = useCallback((element: HTMLElement | null) => {
    // Unobserve old element
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current)
    }

    elementRef.current = element

    // Observe new element
    if (element && observerRef.current) {
      observerRef.current.observe(element)

      // Initial measurement
      const rect = element.getBoundingClientRect()
      handleResize(rect.width, rect.height)
    }
  }, [handleResize])

  return {
    measureRef,
    width: dimensions.width,
    height: dimensions.height,
  }
}

/**
 * Hook for measuring multiple elements.
 * Useful for measuring items in a virtualized list.
 *
 * @returns Methods for managing measurements
 */
export function useMeasureMany() {
  const elementsRef = useRef<Map<string | number, HTMLElement>>(new Map())
  const keysRef = useRef<WeakMap<Element, string | number>>(new WeakMap())
  const observerRef = useRef<ResizeObserver | null>(null)
  const measurementsRef = useRef<Map<string | number, { width: number; height: number }>>(new Map())
  const callbackRef = useRef<((key: string | number, width: number, height: number) => void) | null>(null)

  // Create observer
  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        // The data attribute marks the element as measured; the original key (number or string) comes from the map
        const key = element.dataset['measureKey'] !== undefined ? keysRef.current.get(element) : undefined

        if (key !== undefined) {
          const { width, height } = boxOf(entry)
          measurementsRef.current.set(key, { width, height })
          callbackRef.current?.(key, width, height)
        }
      }
    })

    // Ref callbacks of the first commit run before this effect (and again after a StrictMode
    // re-run), when there was no observer yet: observe what is already registered
    for (const element of elementsRef.current.values()) {
      observerRef.current.observe(element)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  /**
   * Create a ref callback for measuring an element.
   */
  const createMeasureRef = useCallback(
    (key: string | number) => (element: HTMLElement | null) => {
      const elements = elementsRef.current
      const observer = observerRef.current

      // Unobserve old element
      const oldElement = elements.get(key)
      if (oldElement && oldElement !== element) {
        observer?.unobserve(oldElement)
        elements.delete(key)
        keysRef.current.delete(oldElement)
      }

      // Observe new element
      if (element) {
        element.dataset['measureKey'] = String(key)
        keysRef.current.set(element, key)
        elements.set(key, element)
        observer?.observe(element)

        // Initial measurement
        const rect = element.getBoundingClientRect()
        measurementsRef.current.set(key, { width: rect.width, height: rect.height })
      }
    },
    []
  )

  /**
   * Get measurement for a key.
   */
  const getMeasurement = useCallback((key: string | number) => {
    return measurementsRef.current.get(key)
  }, [])

  /**
   * Set callback for measurements.
   */
  const onMeasure = useCallback(
    (callback: (key: string | number, width: number, height: number) => void) => {
      callbackRef.current = callback
    },
    []
  )

  /**
   * Clear all measurements.
   */
  const clear = useCallback(() => {
    const observer = observerRef.current
    for (const element of elementsRef.current.values()) {
      observer?.unobserve(element)
    }
    elementsRef.current.clear()
    measurementsRef.current.clear()
  }, [])

  return {
    createMeasureRef,
    getMeasurement,
    onMeasure,
    clear,
  }
}
