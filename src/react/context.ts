import { createContext, useContext } from 'react'
import type { Kernel } from '../types.js'

/**
 * Context value for Scrollex.
 */
export interface ScrollexContextValue {
  /** Kernel instance */
  kernel: Kernel
}

/**
 * React context for Scrollex kernel access.
 */
export const ScrollexContext = createContext<ScrollexContextValue | null>(null)

/**
 * Hook to access the Scrollex kernel from context.
 *
 * @returns Kernel instance, or null if not within a Scrollex provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const kernel = useScrollex()
 *
 *   const handleClick = () => {
 *     kernel?.scrollToIndex(10, { align: 'center', behavior: 'smooth' })
 *   }
 *
 *   return <button onClick={handleClick}>Scroll to item 10</button>
 * }
 * ```
 */
export function useScrollex(): Kernel | null {
  const context = useContext(ScrollexContext)
  return context?.kernel ?? null
}

/**
 * Hook to access the Scrollex kernel from context.
 * Throws an error if not within a Scrollex provider.
 *
 * @returns Kernel instance
 * @throws Error if not within a Scrollex provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const kernel = useScrollexRequired()
 *   // kernel is guaranteed to be defined
 *   kernel.scrollToIndex(10)
 * }
 * ```
 */
export function useScrollexRequired(): Kernel {
  const context = useContext(ScrollexContext)

  if (!context) {
    throw new Error(
      '[Scrollex] useScrollexRequired must be used within a Scrollex component. ' +
      'Make sure you are rendering this component inside VirtualList, VirtualGrid, or VirtualMasonry.'
    )
  }

  return context.kernel
}
