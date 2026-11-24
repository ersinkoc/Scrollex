import type { VirtualItem, Range } from '../../types.js'

/**
 * Derive the range covered by rendered items (overscan) and by the viewport (visible).
 * Items must be in ascending index order.
 */
export function getItemsRange(items: VirtualItem[], scrollTop: number, viewportHeight: number): Range {
  if (items.length === 0) {
    return { startIndex: 0, endIndex: 0, overscanStartIndex: 0, overscanEndIndex: 0 }
  }

  const overscanStartIndex = items[0]!.index
  const overscanEndIndex = items[items.length - 1]!.index
  const viewEnd = scrollTop + viewportHeight
  let startIndex = -1
  let endIndex = -1

  for (const item of items) {
    if (item.end > scrollTop && item.start < viewEnd) {
      if (startIndex === -1) startIndex = item.index
      endIndex = item.index
    }
  }

  return startIndex === -1
    ? { startIndex: overscanStartIndex, endIndex: overscanEndIndex, overscanStartIndex, overscanEndIndex }
    : { startIndex, endIndex, overscanStartIndex, overscanEndIndex }
}

/**
 * Give items the key the caller's current getItemKey returns. Returns the same array when no key
 * changed, so a reorder that keeps the item count (no kernel event) still re-keys the rows without
 * churning identity otherwise. Items at or past the count are left out: the state they come from is only
 * refreshed in an effect after the count changed, and callers index their data with them.
 */
export function rekeyItems(
  items: VirtualItem[],
  count: number,
  getItemKey: (index: number) => string | number
): VirtualItem[] {
  let changed = false
  const next: VirtualItem[] = []
  for (const item of items) {
    if (item.index >= count) {
      changed = true
      continue
    }
    const key = getItemKey(item.index)
    if (key === item.key) {
      next.push(item)
    } else {
      changed = true
      next.push({ ...item, key })
    }
  }
  return changed ? next : items
}
