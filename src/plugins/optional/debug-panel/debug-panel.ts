import type { Plugin, Kernel, KernelEvent, Range, ScrollPosition } from '../../../types.js'
import type {
  DebugPanelOptions,
  DebugPanelAPI,
  DebugPanelState,
  PerformanceStats,
  EventLogEntry,
  DebugPanelTab,
} from './types.js'

/**
 * Creates a debug panel plugin.
 * Provides debugging and performance monitoring tools.
 *
 * @param options - Plugin options
 * @returns Plugin instance
 */
export function debugPanel(options: DebugPanelOptions = {}): Plugin {
  const resolvedOptions: Required<DebugPanelOptions> = {
    enabled: options.enabled ?? true,
    collapsed: options.collapsed ?? false,
    position: options.position ?? 'bottom-right',
    theme: options.theme ?? 'auto',
    showFps: options.showFps ?? true,
    showViewportOverlay: options.showViewportOverlay ?? false,
    showItemBoundaries: options.showItemBoundaries ?? false,
    logEvents: options.logEvents ?? false,
    maxEventLogEntries: options.maxEventLogEntries ?? 100,
    statsUpdateInterval: options.statsUpdateInterval ?? 100,
  }

  let kernel: Kernel | null = null
  let eventIdCounter = 0
  let statsUpdateTimer: ReturnType<typeof setInterval> | null = null
  let frameCount = 0
  let lastFrameTime = performance.now()
  let lastFpsUpdate = performance.now()
  let currentFps = 60
  let rafId: number | null = null

  const emptyRange: Range = {
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
    start: 0,
    end: 0,
  }

  const emptyScrollPosition: ScrollPosition = {
    scrollTop: 0,
    scrollLeft: 0,
    offset: 0,
    percentage: 0,
  }

  const state: DebugPanelState = {
    visible: resolvedOptions.enabled,
    collapsed: resolvedOptions.collapsed,
    activeTab: 'stats',
    stats: createEmptyStats(),
    eventLog: [],
    showViewportOverlay: resolvedOptions.showViewportOverlay,
    showItemBoundaries: resolvedOptions.showItemBoundaries,
  }

  const listeners = new Set<() => void>()

  /**
   * Create empty stats object.
   */
  function createEmptyStats(): PerformanceStats {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: null,
      totalItems: 0,
      visibleItems: 0,
      renderedItems: 0,
      overscanItems: 0,
      avgItemHeight: 0,
      scrollPosition: { ...emptyScrollPosition },
      visibleRange: { ...emptyRange },
      renderRange: { ...emptyRange },
      scrollVelocity: 0,
      isScrolling: false,
    }
  }

  /**
   * Notify state change listeners.
   */
  function notifyListeners(): void {
    listeners.forEach((listener) => listener())
  }

  /**
   * Update FPS counter.
   */
  function updateFps(): void {
    const now = performance.now()
    frameCount++

    if (now - lastFpsUpdate >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate))
      frameCount = 0
      lastFpsUpdate = now
    }

    state.stats.fps = currentFps
    state.stats.frameTime = now - lastFrameTime
    lastFrameTime = now

    rafId = requestAnimationFrame(updateFps)
  }

  /**
   * Update stats from kernel.
   */
  function updateStats(): void {
    if (!kernel) return

    const scrollPos = kernel.getScrollPosition()
    const visibleRange = kernel.getVisibleRange()
    const renderRange = kernel.getRenderRange()
    const itemCount = kernel.getItemCount()

    // Get memory usage if available
    let memoryUsage: number | null = null
    if ('memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory
      if (memory) {
        memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100
      }
    }

    const visibleItems = (visibleRange.end ?? visibleRange.endIndex) - (visibleRange.start ?? visibleRange.startIndex)
    const renderedItems = (renderRange.end ?? renderRange.endIndex) - (renderRange.start ?? renderRange.startIndex)

    state.stats = {
      ...state.stats,
      memoryUsage,
      totalItems: itemCount,
      visibleItems,
      renderedItems,
      overscanItems: renderedItems - visibleItems,
      avgItemHeight: itemCount > 0 ? kernel.getTotalSize() / itemCount : 0,
      scrollPosition: {
        ...scrollPos,
        offset: scrollPos.scrollTop,
        percentage: kernel.getTotalSize() > 0 ? scrollPos.scrollTop / kernel.getTotalSize() : 0,
      },
      visibleRange: {
        ...visibleRange,
        start: visibleRange.startIndex,
        end: visibleRange.endIndex,
      },
      renderRange: {
        ...renderRange,
        start: renderRange.startIndex,
        end: renderRange.endIndex,
      },
      scrollVelocity: 0,
      isScrolling: kernel.isScrolling(),
    }

    notifyListeners()
  }

  /**
   * Log an event.
   */
  function logEvent(event: KernelEvent): void {
    if (!resolvedOptions.logEvents && state.activeTab !== 'events') return

    const entry: EventLogEntry = {
      id: eventIdCounter++,
      type: event.type,
      timestamp: Date.now(),
      data: event,
    }

    state.eventLog.unshift(entry)

    // Trim to max entries
    if (state.eventLog.length > resolvedOptions.maxEventLogEntries) {
      state.eventLog = state.eventLog.slice(0, resolvedOptions.maxEventLogEntries)
    }

    if (resolvedOptions.logEvents) {
      console.log(`[Scrollex Debug] ${event.type}`, event)
    }

    notifyListeners()
  }

  /**
   * Start monitoring.
   */
  function startMonitoring(): void {
    if (rafId !== null) return

    updateFps()

    statsUpdateTimer = setInterval(updateStats, resolvedOptions.statsUpdateInterval)
  }

  /**
   * Stop monitoring.
   */
  function stopMonitoring(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    if (statsUpdateTimer !== null) {
      clearInterval(statsUpdateTimer)
      statsUpdateTimer = null
    }
  }

  const api: DebugPanelAPI = {
    toggle(): void {
      state.visible = !state.visible
      if (state.visible) {
        startMonitoring()
      } else {
        stopMonitoring()
      }
      notifyListeners()
    },

    show(): void {
      if (!state.visible) {
        state.visible = true
        startMonitoring()
        notifyListeners()
      }
    },

    hide(): void {
      if (state.visible) {
        state.visible = false
        stopMonitoring()
        notifyListeners()
      }
    },

    isVisible(): boolean {
      return state.visible
    },

    setCollapsed(collapsed: boolean): void {
      state.collapsed = collapsed
      notifyListeners()
    },

    isCollapsed(): boolean {
      return state.collapsed
    },

    getStats(): PerformanceStats {
      return { ...state.stats }
    },

    getEventLog(): EventLogEntry[] {
      return [...state.eventLog]
    },

    clearEventLog(): void {
      state.eventLog = []
      notifyListeners()
    },

    setActiveTab(tab: DebugPanelTab): void {
      state.activeTab = tab
      notifyListeners()
    },

    getActiveTab(): DebugPanelTab {
      return state.activeTab
    },

    toggleViewportOverlay(): void {
      state.showViewportOverlay = !state.showViewportOverlay
      notifyListeners()
    },

    toggleItemBoundaries(): void {
      state.showItemBoundaries = !state.showItemBoundaries
      notifyListeners()
    },

    exportData(): string {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        stats: state.stats,
        eventLog: state.eventLog,
        options: resolvedOptions,
      }, null, 2)
    },
  }

  // Extend API with subscription method
  const extendedApi = api as DebugPanelAPI & {
    subscribe(listener: () => void): () => void
    getState(): DebugPanelState
    getOptions(): Required<DebugPanelOptions>
    getKernel(): Kernel | null
  }

  extendedApi.subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  extendedApi.getState = (): DebugPanelState => state

  extendedApi.getOptions = (): Required<DebugPanelOptions> => resolvedOptions

  extendedApi.getKernel = (): Kernel | null => kernel

  return {
    name: 'debug-panel',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel): void {
      kernel = k

      // Subscribe to all events
      const eventTypes = [
        'scroll',
        'scrollStart',
        'scrollEnd',
        'visibleRangeChange',
        'itemMeasured',
        'resize',
        'loadMore',
        'itemsChange',
      ] as const

      eventTypes.forEach((type) => {
        kernel?.on(type as any, logEvent as any)
      })

      if (state.visible) {
        startMonitoring()
      }
    },

    uninstall(): void {
      stopMonitoring()
      kernel = null
    },

    api: extendedApi,
  }
}

export type { DebugPanelOptions, DebugPanelAPI }
