import type { Kernel, VirtualItem, Range, ScrollPosition } from '../../../types.js'

/**
 * Debug panel position.
 */
export type DebugPanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Debug panel theme.
 */
export type DebugPanelTheme = 'light' | 'dark' | 'auto'

/**
 * Debug panel tab.
 */
export type DebugPanelTab = 'stats' | 'viewport' | 'items' | 'events'

/**
 * Performance stats.
 */
export interface PerformanceStats {
  /** Frames per second */
  fps: number
  /** Frame time in ms */
  frameTime: number
  /** Memory usage in MB (if available) */
  memoryUsage: number | null
  /** Total items */
  totalItems: number
  /** Visible items count */
  visibleItems: number
  /** Rendered items count */
  renderedItems: number
  /** Overscan items */
  overscanItems: number
  /** Average item height */
  avgItemHeight: number
  /** Scroll position */
  scrollPosition: ScrollPosition
  /** Visible range */
  visibleRange: Range
  /** Render range */
  renderRange: Range
  /** Scroll velocity */
  scrollVelocity: number
  /** Is scrolling */
  isScrolling: boolean
}

/**
 * Event log entry.
 */
export interface EventLogEntry {
  /** Event ID */
  id: number
  /** Event type */
  type: string
  /** Timestamp */
  timestamp: number
  /** Event data */
  data: unknown
}

/**
 * Debug panel options.
 */
export interface DebugPanelOptions {
  /** Whether debug panel is enabled */
  enabled?: boolean
  /** Initial collapsed state */
  collapsed?: boolean
  /** Panel position */
  position?: DebugPanelPosition
  /** Panel theme */
  theme?: DebugPanelTheme
  /** Show FPS counter */
  showFps?: boolean
  /** Show viewport overlay */
  showViewportOverlay?: boolean
  /** Show item boundaries */
  showItemBoundaries?: boolean
  /** Log events to console */
  logEvents?: boolean
  /** Max event log entries */
  maxEventLogEntries?: number
  /** Stats update interval in ms */
  statsUpdateInterval?: number
}

/**
 * Debug panel API.
 */
export interface DebugPanelAPI {
  /** Toggle panel visibility */
  toggle(): void
  /** Show panel */
  show(): void
  /** Hide panel */
  hide(): void
  /** Check if visible */
  isVisible(): boolean
  /** Set collapsed state */
  setCollapsed(collapsed: boolean): void
  /** Check if collapsed */
  isCollapsed(): boolean
  /** Get current stats */
  getStats(): PerformanceStats
  /** Get event log */
  getEventLog(): EventLogEntry[]
  /** Clear event log */
  clearEventLog(): void
  /** Set active tab */
  setActiveTab(tab: DebugPanelTab): void
  /** Get active tab */
  getActiveTab(): DebugPanelTab
  /** Toggle viewport overlay */
  toggleViewportOverlay(): void
  /** Toggle item boundaries */
  toggleItemBoundaries(): void
  /** Export debug data as JSON */
  exportData(): string
}

/**
 * Debug panel state.
 */
export interface DebugPanelState {
  visible: boolean
  collapsed: boolean
  activeTab: DebugPanelTab
  stats: PerformanceStats
  eventLog: EventLogEntry[]
  showViewportOverlay: boolean
  showItemBoundaries: boolean
}

/**
 * Debug panel context.
 */
export interface DebugPanelContext {
  kernel: Kernel | null
  state: DebugPanelState
  options: Required<DebugPanelOptions>
  api: DebugPanelAPI
}
