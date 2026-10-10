import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export interface LoadMoreWhenShortOptions {
  /** Number of items currently in the list */
  count: number
  /** Total size of the content along the scroll axis */
  totalSize: number
  hasMore: boolean
  isLoading: boolean
  threshold: number
  horizontal?: boolean
  onLoadMore?: () => void | Promise<void>
}

/**
 * Requests more data when the content does not overflow the container.
 * Such a container can't scroll, so the scroll handler would never ask for the next page.
 * Asks at most once per item count; a growing list that is still short asks again.
 */
export function useLoadMoreWhenShort(
  containerRef: RefObject<HTMLElement | null>,
  { count, totalSize, hasMore, isLoading, threshold, horizontal = false, onLoadMore }: LoadMoreWhenShortOptions
): void {
  const requestedCount = useRef(-1)

  useEffect(() => {
    if (!hasMore) {
      requestedCount.current = -1
      return
    }
    const element = containerRef.current
    if (!element || !onLoadMore || isLoading || requestedCount.current === count) return

    const distanceToEnd = horizontal
      ? element.scrollWidth - element.scrollLeft - element.clientWidth
      : element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceToEnd < threshold) {
      requestedCount.current = count
      void onLoadMore()
    }
  }, [count, totalSize, hasMore, isLoading, threshold, horizontal, !!onLoadMore])
}
