import type { CSSProperties, ReactNode, RefCallback, RefObject } from 'react'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Represents a virtualized item with position and size information.
 */
export interface VirtualItem {
  /** Index of the item in the data array */
  index: number
  /** Unique key for React reconciliation */
  key: string | number
  /** Offset from the start of the scroll container (px) */
  start: number
  /** End position (start + size) */
  end: number
  /** Size of the item (height for vertical, width for horizontal) */
  size: number
  /** Lane/column index for grid and masonry layouts */
  lane: number
}

/**
 * Represents the visible range of items.
 */
export interface Range {
  /** First visible item index */
  startIndex: number
  /** Last visible item index */
  endIndex: number
  /** First rendered item index (including overscan) */
  overscanStartIndex: number
  /** Last rendered item index (including overscan) */
  overscanEndIndex: number
  /** Alias for startIndex */
  start?: number
  /** Alias for endIndex */
  end?: number
}

/**
 * Represents scroll position in both axes.
 */
export interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
  /** Normalized offset (scrollTop for vertical, scrollLeft for horizontal) */
  offset?: number
  /** Scroll percentage (0-1) */
  percentage?: number
}

/**
 * Represents the viewport dimensions.
 */
export interface Viewport {
  /** Visible width of the container */
  width: number
  /** Visible height of the container */
  height: number
  /** Total scrollable height */
  scrollHeight: number
  /** Total scrollable width */
  scrollWidth: number
}

/**
 * Scroll direction.
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'none'

/**
 * Scroll behavior.
 */
export type ScrollBehavior = 'auto' | 'smooth'

/**
 * Alignment options for scrollToIndex.
 */
export type ScrollAlignment = 'start' | 'center' | 'end' | 'auto'

// ============================================================================
// Event Types
// ============================================================================

/**
 * All possible event types.
 */
export type EventType =
  | 'scroll'
  | 'scroll-start'
  | 'scroll-end'
  | 'visible-range-change'
  | 'item-measured'
  | 'resize'
  | 'load-more'
  | 'items-change'
  // Aliases for camelCase
  | 'scrollStart'
  | 'scrollEnd'
  | 'visibleRangeChange'
  | 'itemMeasured'
  | 'loadMore'
  | 'itemsChange'

/**
 * Scroll event payload.
 */
export interface ScrollEvent {
  type: 'scroll'
  scrollTop: number
  scrollLeft: number
  deltaY: number
  deltaX: number
  direction: ScrollDirection
  timestamp: number
}

/**
 * Scroll start event payload.
 */
export interface ScrollStartEvent {
  type: 'scroll-start'
  scrollTop: number
  scrollLeft: number
  timestamp: number
}

/**
 * Scroll end event payload.
 */
export interface ScrollEndEvent {
  type: 'scroll-end'
  scrollTop: number
  scrollLeft: number
  timestamp: number
}

/**
 * Visible range change event payload.
 */
export interface VisibleRangeChangeEvent {
  type: 'visible-range-change'
  range: Range
  previousRange: Range | null
}

/**
 * Item measured event payload.
 */
export interface ItemMeasuredEvent {
  type: 'item-measured'
  index: number
  height: number
  previousHeight: number | undefined
}

/**
 * Resize event payload.
 */
export interface ResizeEvent {
  type: 'resize'
  viewport: Viewport
  previousViewport: Viewport | null
}

/**
 * Load more event payload.
 */
export interface LoadMoreEvent {
  type: 'load-more'
  direction: 'forward' | 'backward'
}

/**
 * Items change event payload.
 */
export interface ItemsChangeEvent {
  type: 'items-change'
  count: number
  previousCount: number
}

/**
 * Union of all kernel events.
 */
export type KernelEvent =
  | ScrollEvent
  | ScrollStartEvent
  | ScrollEndEvent
  | VisibleRangeChangeEvent
  | ItemMeasuredEvent
  | ResizeEvent
  | LoadMoreEvent
  | ItemsChangeEvent

/**
 * Event handler function type.
 */
export type EventHandler<T = KernelEvent> = (event: T) => void

/**
 * Unsubscribe function returned by event subscriptions.
 */
export type Unsubscribe = () => void

// ============================================================================
// Scroll Options
// ============================================================================

/**
 * Options for scroll operations.
 */
export interface ScrollOptions {
  /** Scroll behavior */
  behavior?: ScrollBehavior
  /** Duration for smooth scroll (ms) */
  duration?: number
  /** Easing function for smooth scroll */
  easing?: EasingFunction
}

/**
 * Options for scrollToIndex operations.
 */
export interface ScrollToIndexOptions extends ScrollOptions {
  /** Alignment of the item in the viewport */
  align?: ScrollAlignment
  /** Additional offset (px) */
  offset?: number
}

/**
 * Easing function type.
 */
export type EasingFunction = (t: number) => number

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Plugin type - core plugins are always loaded, optional are loaded on demand.
 */
export type PluginType = 'core' | 'optional'

/**
 * Plugin hooks interface.
 */
export interface PluginHooks {
  /** Called on scroll */
  onScroll?: (event: ScrollEvent) => void
  /** Called when scroll starts */
  onScrollStart?: (event: ScrollStartEvent) => void
  /** Called when scroll ends */
  onScrollEnd?: (event: ScrollEndEvent) => void
  /** Called when visible range changes */
  onVisibleRangeChange?: (range: Range, previousRange: Range | null) => void
  /** Called when an item is measured */
  onItemMeasured?: (index: number, height: number) => void
  /** Called on viewport resize */
  onResize?: (viewport: Viewport) => void
  /** Called when load more is triggered */
  onLoadMore?: (direction: 'forward' | 'backward') => void
  /** Called when item count changes */
  onItemsChange?: (count: number, previousCount: number) => void
}

/**
 * Plugin metadata.
 */
export interface PluginInfo {
  name: string
  version: string
  type: PluginType
  enabled: boolean
}

/**
 * Plugin interface.
 */
export interface Plugin {
  /** Unique plugin name */
  name: string
  /** Plugin version */
  version: string
  /** Plugin type (core or optional) */
  type: PluginType
  /** Install plugin into kernel */
  install?(kernel: Kernel): void
  /** Uninstall plugin */
  uninstall?(): void
  /** Plugin hooks */
  hooks?: PluginHooks
  /** Public API exposed by the plugin */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api?: any
}

/**
 * Plugin configuration for createPlugin helper.
 */
export interface PluginConfig {
  name: string
  version: string
  type: PluginType
  install: (kernel: Kernel) => void
  uninstall?: () => void
  hooks?: PluginHooks
  api?: Record<string, unknown>
}

// ============================================================================
// Kernel Types
// ============================================================================

/**
 * Kernel configuration options.
 */
export interface KernelOptions {
  /** Total number of items */
  itemCount: number
  /** Estimated height of items (used before measurement) */
  estimatedItemHeight: number
  /** Number of extra items to render outside viewport */
  overscan: number
  /** Scroll direction */
  direction: 'vertical' | 'horizontal'
  /** Function to get item key */
  getItemKey?: (index: number) => string | number
}

/**
 * Kernel interface - the core of the virtualization engine.
 */
export interface Kernel {
  // Plugin Management
  /** Register a plugin */
  register(plugin: Plugin): void
  /** Unregister a plugin by name */
  unregister(pluginName: string): void
  /** Get a plugin by name */
  getPlugin<T extends Plugin>(name: string): T | undefined
  /** List all registered plugins */
  listPlugins(): PluginInfo[]

  // Scroll Control
  /** Get current scroll position */
  getScrollPosition(): ScrollPosition
  /** Set scroll position directly */
  setScrollPosition(position: ScrollPosition): void
  /** Scroll to offset */
  scrollTo(offset: number, options?: ScrollOptions): void
  /** Scroll to item index */
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void

  // Viewport
  /** Get viewport dimensions */
  getViewport(): Viewport
  /** Get visible range */
  getVisibleRange(): Range
  /** Get render range (including overscan) */
  getRenderRange(): Range

  // Measurement
  /** Measure an item's size */
  measureItem(index: number, size: number): void
  /** Get cached height for an item */
  getCachedHeight(index: number): number | undefined
  /** Invalidate measurement for an item */
  invalidateMeasurement(index: number): void
  /** Invalidate all measurements */
  invalidateAllMeasurements(): void
  /** Get estimated item height */
  getEstimatedHeight(): number
  /** Get item offset */
  getItemOffset(index: number): number

  // Events
  /** Emit an event */
  emit(event: KernelEvent): void
  /** Subscribe to an event type */
  on<T extends KernelEvent>(eventType: T['type'], handler: EventHandler<T>): Unsubscribe
  /** Unsubscribe from an event type */
  off<T extends KernelEvent>(eventType: T['type'], handler: EventHandler<T>): void

  // Configuration
  /** Update kernel configuration */
  configure(options: Partial<KernelOptions>): void
  /** Get current configuration */
  getOptions(): KernelOptions

  // State
  /** Check if currently scrolling */
  isScrolling(): boolean
  /** Get item count */
  getItemCount(): number
  /** Get total scroll size */
  getTotalSize(): number

  // Lifecycle
  /** Attach to a container element */
  attach(container: HTMLElement): void
  /** Detach from container */
  detach(): void
  /** Destroy the kernel */
  destroy(): void
}

// ============================================================================
// React Component Props
// ============================================================================

/**
 * Props passed to the renderItem function.
 */
export interface RenderItemProps<T> {
  /** The item data */
  item: T
  /** Item index in the data array */
  index: number
  /** Styles to apply (position, height) */
  style: CSSProperties
  /** Ref callback for measuring dynamic heights */
  measureRef: RefCallback<HTMLElement>
  /** Whether the item is in the visible range (not just rendered for overscan) */
  isVisible: boolean
  /** Whether the list is currently scrolling */
  isScrolling: boolean
}

/**
 * Props for grid item rendering.
 */
export interface GridRenderItemProps<T> extends RenderItemProps<T> {
  /** Column index (0-based) */
  columnIndex: number
  /** Row index (0-based) */
  rowIndex: number
  /** Calculated column width */
  columnWidth: number
}

/**
 * Props for masonry item rendering.
 */
export interface MasonryRenderItemProps<T> extends GridRenderItemProps<T> {
  /** Calculated item width */
  width: number
}

/**
 * Information about rendered items.
 */
export interface ItemsRenderedInfo {
  overscanStartIndex: number
  overscanEndIndex: number
  visibleStartIndex: number
  visibleEndIndex: number
}

/**
 * VirtualList component props.
 */
export interface VirtualListProps<T> {
  // Required
  /** Array of items to render */
  data: T[]
  /** Function to render each item */
  renderItem: (props: RenderItemProps<T>) => ReactNode

  // Item sizing
  /** Fixed item height or 'auto' for dynamic measurement */
  itemHeight: number | 'auto'
  /** Estimated height for auto measurement (required when itemHeight='auto') */
  estimatedItemHeight?: number

  // Container sizing
  /** Container height (number for px, string for CSS value) */
  height?: number | string
  /** Container width (number for px, string for CSS value) */
  width?: number | string

  // Scroll direction
  /** Scroll direction */
  direction?: 'vertical' | 'horizontal'

  // Performance
  /** Number of extra items to render outside viewport */
  overscan?: number

  // Initial state
  /** Initial scroll offset */
  initialScrollOffset?: number

  // Item identification
  /** Function to get unique key for each item */
  getItemKey?: (index: number, data: T[]) => string | number

  // Infinite scroll
  /** Callback when more items should be loaded */
  onLoadMore?: () => void | Promise<void>
  /** Whether there are more items to load */
  hasMore?: boolean
  /** Whether currently loading more items */
  isLoading?: boolean
  /** Loading indicator element */
  loadingIndicator?: ReactNode
  /** Threshold in pixels from edge to trigger load more */
  threshold?: number

  // Events
  /** Callback on scroll */
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  /** Callback when visible range changes */
  onVisibleRangeChange?: (range: Range) => void
  /** Callback when items are rendered */
  onItemsRendered?: (info: ItemsRenderedInfo) => void

  // Plugins
  /** Array of plugins to use */
  plugins?: Plugin[]

  // Styling
  /** Class name for outer container */
  className?: string
  /** Style for outer container */
  style?: CSSProperties
  /** Class name for inner container */
  innerClassName?: string
  /** Style for inner container */
  innerStyle?: CSSProperties
  /** Class name for item wrapper */
  itemClassName?: string
  /** Style for item wrapper */
  itemStyle?: CSSProperties

  // Accessibility
  /** ARIA role for container */
  role?: string
  /** ARIA label */
  ariaLabel?: string
  /** Tab index */
  tabIndex?: number
}

/**
 * Gap configuration for grid layouts.
 */
export interface GridGap {
  x: number
  y: number
}

/**
 * VirtualGrid component props.
 */
export interface VirtualGridProps<T> extends Omit<VirtualListProps<T>, 'itemHeight' | 'renderItem'> {
  /** Render function for grid items */
  renderItem: (props: GridRenderItemProps<T>) => ReactNode
  /** Fixed row height */
  itemHeight: number
  /** Number of columns or 'auto' for responsive */
  columns: number | 'auto'
  /** Minimum column width for auto columns */
  minColumnWidth?: number
  /** Gap between items */
  gap?: number | GridGap
}

/**
 * VirtualMasonry component props.
 */
export interface VirtualMasonryProps<T> extends Omit<VirtualGridProps<T>, 'itemHeight' | 'renderItem'> {
  /** Render function for masonry items */
  renderItem: (props: MasonryRenderItemProps<T>) => ReactNode
  /** Function to calculate item height based on item and column width */
  getItemHeight: (item: T, columnWidth: number) => number
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Options for useVirtualList hook.
 */
export interface UseVirtualListOptions {
  /** Total number of items */
  count: number
  /** Function to get item height */
  getItemHeight?: (index: number) => number
  /** Estimated height for unmeasured items */
  estimatedItemHeight?: number
  /** Number of extra items to render */
  overscan?: number
  /** Padding at the start of the list */
  paddingStart?: number
  /** Padding at the end of the list */
  paddingEnd?: number
  /** Scroll margin */
  scrollMargin?: number
  /** Initial scroll offset */
  initialOffset?: number
  /** Function to get item key */
  getItemKey?: (index: number) => string | number
  /** Whether to scroll horizontally */
  horizontal?: boolean
  /** Container ref */
  containerRef: RefObject<HTMLElement>
}

/**
 * Return type for useVirtualList hook.
 */
export interface UseVirtualListReturn {
  /** Virtual items to render */
  virtualItems: VirtualItem[]
  /** Total scroll size */
  totalSize: number
  /** Current scroll offset */
  scrollOffset: number
  /** Whether currently scrolling */
  isScrolling: boolean
  /** Scroll to offset */
  scrollTo: (offset: number, options?: ScrollOptions) => void
  /** Scroll to item index */
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  /** Measure an element */
  measureElement: (index: number, element: HTMLElement | null) => void
  /** Visible range */
  range: Range
  /** Get measurement for an index */
  getMeasurement: (index: number) => number | undefined
  /** Invalidate measurement for an index */
  invalidateMeasurement: (index: number) => void
  /** Invalidate all measurements */
  invalidateAllMeasurements: () => void
}

/**
 * Options for useVirtualGrid hook.
 */
export interface UseVirtualGridOptions extends Omit<UseVirtualListOptions, 'getItemHeight'> {
  /** Number of columns */
  columns: number
  /** Row height */
  rowHeight: number
  /** Gap between items */
  gap?: number | GridGap
}

/**
 * Return type for useVirtualGrid hook.
 */
export interface UseVirtualGridReturn extends UseVirtualListReturn {
  /** Number of columns */
  columnCount: number
  /** Width of each column */
  columnWidth: number
  /** Number of rows */
  rowCount: number
}

/**
 * Options for useVirtualMasonry hook.
 */
export interface UseVirtualMasonryOptions {
  /** Total number of items */
  count: number
  /** Number of columns */
  columns: number
  /** Function to get item height given index and column width */
  getItemHeight: (index: number, columnWidth: number) => number
  /** Gap between items */
  gap?: number
  /** Container ref */
  containerRef: RefObject<HTMLElement>
  /** Number of extra items to render */
  overscan?: number
}

/**
 * Return type for useVirtualMasonry hook.
 */
export interface UseVirtualMasonryReturn extends UseVirtualListReturn {
  /** Number of columns */
  columnCount: number
  /** Width of each column */
  columnWidth: number
  /** Heights of each column */
  columnHeights: number[]
}

/**
 * Handle exposed by VirtualList component ref.
 */
export interface VirtualListHandle {
  /** Scroll to offset */
  scrollTo: (offset: number, options?: ScrollOptions) => void
  /** Scroll to item index */
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  /** Scroll to top */
  scrollToTop: (options?: ScrollOptions) => void
  /** Scroll to bottom */
  scrollToBottom: (options?: ScrollOptions) => void
  /** Get current scroll position */
  getScrollPosition: () => ScrollPosition
}
