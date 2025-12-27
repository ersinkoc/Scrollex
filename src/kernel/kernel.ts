import type {
  Kernel,
  KernelOptions,
  Plugin,
  PluginInfo,
  ScrollPosition,
  Viewport,
  Range,
  KernelEvent,
  EventHandler,
  Unsubscribe,
  ScrollOptions,
  ScrollToIndexOptions,
} from '../types.js'
import { EventBus } from './event-bus.js'
import { ScrollEngine } from './scroll-engine.js'
import { ViewportManager } from './viewport.js'
import { RangeCalculator } from './range-calculator.js'
import { PluginRegistry } from './plugin-registry.js'

/**
 * Default kernel options.
 */
const DEFAULT_OPTIONS: KernelOptions = {
  itemCount: 0,
  estimatedItemHeight: 50,
  overscan: 5,
  direction: 'vertical',
  getItemKey: (index) => index,
}

/**
 * Creates a new kernel instance.
 *
 * @param options - Kernel configuration
 * @returns Kernel instance
 */
export function createKernel(options: Partial<KernelOptions> = {}): Kernel {
  const config: KernelOptions = { ...DEFAULT_OPTIONS, ...options }

  // Core components
  const eventBus = new EventBus()
  const scrollEngine = new ScrollEngine()
  const viewportManager = new ViewportManager()
  const rangeCalculator = new RangeCalculator({
    itemCount: config.itemCount,
    estimatedItemHeight: config.estimatedItemHeight,
    overscan: config.overscan,
  })
  const pluginRegistry = new PluginRegistry()

  // State
  let currentRange: Range = {
    startIndex: 0,
    endIndex: 0,
    overscanStartIndex: 0,
    overscanEndIndex: 0,
  }
  let attached = false

  // Kernel instance
  const kernel: Kernel = {
    // Plugin Management
    register(plugin: Plugin): void {
      pluginRegistry.register(plugin)
    },

    unregister(pluginName: string): void {
      pluginRegistry.unregister(pluginName)
    },

    getPlugin<T extends Plugin>(name: string): T | undefined {
      return pluginRegistry.get<T>(name)
    },

    listPlugins(): PluginInfo[] {
      return pluginRegistry.list()
    },

    // Scroll Control
    getScrollPosition(): ScrollPosition {
      return scrollEngine.getScrollPosition()
    },

    setScrollPosition(position: ScrollPosition): void {
      scrollEngine.setScrollPosition(position)
    },

    scrollTo(offset: number, options?: ScrollOptions): void {
      scrollEngine.scrollTo(offset, options)
    },

    scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
      const { align = 'auto', offset: additionalOffset = 0, ...scrollOptions } = options

      const itemOffset = rangeCalculator.getItemOffset(index)
      const itemSize = rangeCalculator.getItemSize(index)
      const viewport = viewportManager.getViewport()

      let targetOffset: number

      switch (align) {
        case 'start':
          targetOffset = itemOffset
          break
        case 'center':
          targetOffset = itemOffset - viewport.height / 2 + itemSize / 2
          break
        case 'end':
          targetOffset = itemOffset - viewport.height + itemSize
          break
        case 'auto':
        default: {
          const scrollPosition = scrollEngine.getScrollPosition()
          const visibleStart = scrollPosition.scrollTop
          const visibleEnd = visibleStart + viewport.height
          const itemEnd = itemOffset + itemSize

          if (itemOffset < visibleStart) {
            // Item is above viewport
            targetOffset = itemOffset
          } else if (itemEnd > visibleEnd) {
            // Item is below viewport
            targetOffset = itemEnd - viewport.height
          } else {
            // Item is already visible, no scroll needed
            return
          }
          break
        }
      }

      // Clamp to valid range
      const maxScroll = Math.max(0, rangeCalculator.getTotalSize() - viewport.height)
      targetOffset = Math.max(0, Math.min(targetOffset + additionalOffset, maxScroll))

      scrollEngine.scrollTo(targetOffset, scrollOptions)
    },

    // Viewport
    getViewport(): Viewport {
      return viewportManager.getViewport()
    },

    getVisibleRange(): Range {
      return { ...currentRange }
    },

    getRenderRange(): Range {
      return {
        startIndex: currentRange.overscanStartIndex,
        endIndex: currentRange.overscanEndIndex,
        overscanStartIndex: currentRange.overscanStartIndex,
        overscanEndIndex: currentRange.overscanEndIndex,
        start: currentRange.overscanStartIndex,
        end: currentRange.overscanEndIndex,
      }
    },

    // Measurement
    measureItem(index: number, size: number): void {
      const previousHeight = rangeCalculator.setItemHeight(index, size)

      eventBus.emit({
        type: 'item-measured',
        index,
        height: size,
        previousHeight,
      })

      // Recalculate range after measurement
      updateVisibleRange()
    },

    getCachedHeight(index: number): number | undefined {
      return rangeCalculator.getCachedHeight(index)
    },

    invalidateMeasurement(index: number): void {
      rangeCalculator.invalidate(index)
      updateVisibleRange()
    },

    invalidateAllMeasurements(): void {
      rangeCalculator.invalidateAll()
      updateVisibleRange()
    },

    getEstimatedHeight(): number {
      return rangeCalculator.getEstimatedHeight()
    },

    getItemOffset(index: number): number {
      return rangeCalculator.getItemOffset(index)
    },

    // Events
    emit(event: KernelEvent): void {
      eventBus.emit(event)
    },

    on<T extends KernelEvent>(
      eventType: T['type'],
      handler: EventHandler<T>
    ): Unsubscribe {
      return eventBus.on(eventType, handler)
    },

    off<T extends KernelEvent>(
      eventType: T['type'],
      handler: EventHandler<T>
    ): void {
      eventBus.off(eventType, handler)
    },

    // Configuration
    configure(newOptions: Partial<KernelOptions>): void {
      const previousCount = config.itemCount

      if (newOptions.itemCount !== undefined) {
        config.itemCount = newOptions.itemCount
        rangeCalculator.setItemCount(newOptions.itemCount)

        if (newOptions.itemCount !== previousCount) {
          eventBus.emit({
            type: 'items-change',
            count: newOptions.itemCount,
            previousCount,
          })
        }
      }

      if (newOptions.estimatedItemHeight !== undefined) {
        config.estimatedItemHeight = newOptions.estimatedItemHeight
        rangeCalculator.setEstimatedHeight(newOptions.estimatedItemHeight)
      }

      if (newOptions.overscan !== undefined) {
        config.overscan = newOptions.overscan
        rangeCalculator.setOverscan(newOptions.overscan)
      }

      if (newOptions.direction !== undefined) {
        config.direction = newOptions.direction
      }

      if (newOptions.getItemKey !== undefined) {
        config.getItemKey = newOptions.getItemKey
      }

      updateVisibleRange()
    },

    getOptions(): KernelOptions {
      return { ...config }
    },

    // State
    isScrolling(): boolean {
      return scrollEngine.isScrolling()
    },

    getItemCount(): number {
      return config.itemCount
    },

    getTotalSize(): number {
      return rangeCalculator.getTotalSize()
    },

    // Lifecycle
    attach(container: HTMLElement): void {
      if (attached) {
        kernel.detach()
      }

      scrollEngine.attach(container)
      viewportManager.attach(container)
      attached = true

      // Set up callbacks
      scrollEngine.onScroll((event) => {
        eventBus.emit(event)
        updateVisibleRange()
      })

      scrollEngine.onScrollStart((event) => {
        eventBus.emit(event)
      })

      scrollEngine.onScrollEnd((event) => {
        eventBus.emit(event)
      })

      viewportManager.onChange((event) => {
        eventBus.emit(event)
        updateVisibleRange()
      })

      // Initial range calculation
      updateVisibleRange()
    },

    detach(): void {
      scrollEngine.detach()
      viewportManager.detach()
      attached = false
    },

    destroy(): void {
      kernel.detach()
      pluginRegistry.clear()
      eventBus.clear()
    },
  }

  // Set kernel reference in plugin registry
  pluginRegistry.setKernel(kernel)

  /**
   * Update the visible range and emit event if changed.
   */
  function updateVisibleRange(): void {
    if (!attached) return

    const viewport = viewportManager.getViewport()
    const scrollPosition = scrollEngine.getScrollPosition()
    const scrollOffset = config.direction === 'vertical'
      ? scrollPosition.scrollTop
      : scrollPosition.scrollLeft
    const viewportSize = config.direction === 'vertical'
      ? viewport.height
      : viewport.width

    const previousRange = { ...currentRange }
    currentRange = rangeCalculator.getVisibleRange(scrollOffset, viewportSize)

    // Check if range changed
    if (
      currentRange.startIndex !== previousRange.startIndex ||
      currentRange.endIndex !== previousRange.endIndex ||
      currentRange.overscanStartIndex !== previousRange.overscanStartIndex ||
      currentRange.overscanEndIndex !== previousRange.overscanEndIndex
    ) {
      eventBus.emit({
        type: 'visible-range-change',
        range: currentRange,
        previousRange,
      })
    }
  }

  return kernel
}

/**
 * Create a plugin helper function.
 *
 * @param config - Plugin configuration
 * @returns Plugin instance
 */
export function createPlugin(config: {
  name: string
  version: string
  type: 'core' | 'optional'
  install: (kernel: Kernel) => void
  uninstall?: () => void
  hooks?: Plugin['hooks']
  api?: Plugin['api']
}): Plugin {
  let installedKernel: Kernel | null = null

  return {
    name: config.name,
    version: config.version,
    type: config.type,
    hooks: config.hooks,
    api: config.api,

    install(kernel: Kernel): void {
      installedKernel = kernel
      config.install(kernel)
    },

    uninstall(): void {
      config.uninstall?.()
      installedKernel = null
    },
  }
}
