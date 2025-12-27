import { useCallback, useRef, useEffect } from 'react'

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
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle resize
  const handleResize = useCallback(
    (width: number, height: number) => {
      dimensionsRef.current = { width, height }

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
    [onResize, debounce]
  )

  // Create observer
  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        handleResize(width, height)
      }
    })

    // Observe current element if exists
    if (elementRef.current) {
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
    width: dimensionsRef.current.width,
    height: dimensionsRef.current.height,
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
  const observerRef = useRef<ResizeObserver | null>(null)
  const measurementsRef = useRef<Map<string | number, { width: number; height: number }>>(new Map())
  const callbackRef = useRef<((key: string | number, width: number, height: number) => void) | null>(null)

  // Create observer
  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const key = element.dataset['measureKey']

        if (key !== undefined) {
          const { width, height } = entry.contentRect
          measurementsRef.current.set(key, { width, height })
          callbackRef.current?.(key, width, height)
        }
      }
    })

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
      }

      // Observe new element
      if (element) {
        element.dataset['measureKey'] = String(key)
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
