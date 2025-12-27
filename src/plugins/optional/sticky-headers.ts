import type { Plugin, Kernel, ScrollEvent } from '../../types.js'

/**
 * Sticky headers plugin options.
 */
export interface StickyHeadersOptions {
  /** Height of headers (or function to get height by group ID) */
  headerHeight: number | ((groupId: string) => number)
  /** Function to determine if an item is a header */
  isHeader: (index: number) => boolean
  /** Function to get the group ID for an item */
  getGroupId: (index: number) => string
  /** Z-index for sticky headers */
  zIndex?: number
  /** Offset from top for sticky positioning */
  stickyOffset?: number
}

/**
 * Sticky headers plugin API.
 */
export interface StickyHeadersAPI {
  /** Get the currently sticky header index */
  getCurrentStickyHeader(): number | null
  /** Get the group ID for an item index */
  getGroupForIndex(index: number): string
  /** Scroll to a group by ID */
  scrollToGroup(groupId: string): void
  /** Get all header indices */
  getHeaderIndices(): number[]
  /** Get all group IDs */
  getGroupIds(): string[]
  /** Check if an index is a header */
  isHeader(index: number): boolean
}

/**
 * Creates a sticky headers plugin.
 * Enables sticky group headers that remain visible while scrolling.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 *
 * @example
 * ```tsx
 * import { stickyHeaders } from '@oxog/scrollex/plugins'
 *
 * const groupedItems = [
 *   { type: 'header', groupId: 'A', title: 'Group A' },
 *   { type: 'item', groupId: 'A', name: 'Item 1' },
 *   { type: 'item', groupId: 'A', name: 'Item 2' },
 *   { type: 'header', groupId: 'B', title: 'Group B' },
 *   { type: 'item', groupId: 'B', name: 'Item 3' },
 * ]
 *
 * <VirtualList
 *   data={groupedItems}
 *   plugins={[stickyHeaders({
 *     headerHeight: 40,
 *     isHeader: (index) => groupedItems[index].type === 'header',
 *     getGroupId: (index) => groupedItems[index].groupId,
 *   })]}
 *   renderItem={({ item, style }) => (
 *     item.type === 'header'
 *       ? <Header style={style}>{item.title}</Header>
 *       : <Row style={style}>{item.name}</Row>
 *   )}
 * />
 * ```
 */
export function stickyHeaders(options: StickyHeadersOptions): Plugin {
  const {
    headerHeight,
    isHeader,
    getGroupId,
    zIndex = 10,
    stickyOffset = 0,
  } = options

  let kernel: Kernel | null = null
  let currentStickyHeader: number | null = null
  let headerIndices: number[] = []
  let groupIdMap: Map<string, number[]> = new Map()

  /**
   * Get header height for a group.
   */
  function getHeaderHeight(groupId: string): number {
    return typeof headerHeight === 'function' ? headerHeight(groupId) : headerHeight
  }

  /**
   * Build header index cache.
   */
  function buildHeaderCache(): void {
    if (!kernel) return

    headerIndices = []
    groupIdMap = new Map()

    const itemCount = kernel.getItemCount()

    for (let i = 0; i < itemCount; i++) {
      const groupId = getGroupId(i)

      if (isHeader(i)) {
        headerIndices.push(i)
      }

      // Build group mapping
      const groupItems = groupIdMap.get(groupId)
      if (groupItems) {
        groupItems.push(i)
      } else {
        groupIdMap.set(groupId, [i])
      }
    }
  }

  /**
   * Update the current sticky header based on scroll position.
   */
  function updateStickyHeader(event: ScrollEvent): void {
    if (!kernel || headerIndices.length === 0) {
      currentStickyHeader = null
      return
    }

    const scrollTop = event.scrollTop + stickyOffset

    // Find the last header that's above the scroll position
    let newStickyHeader: number | null = null

    for (const headerIndex of headerIndices) {
      const headerOffset = kernel.getItemOffset(headerIndex)

      if (headerOffset <= scrollTop) {
        newStickyHeader = headerIndex
      } else {
        break
      }
    }

    currentStickyHeader = newStickyHeader
  }

  /**
   * Find header index for a group.
   */
  function findHeaderForGroup(groupId: string): number | null {
    const items = groupIdMap.get(groupId)
    if (!items || items.length === 0) return null

    const firstItem = items[0]
    if (firstItem !== undefined && isHeader(firstItem)) {
      return firstItem
    }

    return null
  }

  const api: StickyHeadersAPI = {
    getCurrentStickyHeader(): number | null {
      return currentStickyHeader
    },

    getGroupForIndex(index: number): string {
      return getGroupId(index)
    },

    scrollToGroup(groupId: string): void {
      if (!kernel) return

      const headerIndex = findHeaderForGroup(groupId)
      if (headerIndex !== null) {
        kernel.scrollToIndex(headerIndex, { align: 'start' })
      }
    },

    getHeaderIndices(): number[] {
      return [...headerIndices]
    },

    getGroupIds(): string[] {
      return Array.from(groupIdMap.keys())
    },

    isHeader(index: number): boolean {
      return isHeader(index)
    },
  }

  return {
    name: 'sticky-headers',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k
      buildHeaderCache()
    },

    uninstall(): void {
      headerIndices = []
      groupIdMap.clear()
      currentStickyHeader = null
      kernel = null
    },

    hooks: {
      onScroll: updateStickyHeader,
      onItemsChange: () => buildHeaderCache(),
    },

    api,
  }
}
