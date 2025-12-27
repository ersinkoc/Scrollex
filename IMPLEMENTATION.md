# Scrollex - Implementation Guide

## Architecture Overview

### Micro-Kernel Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ VirtualList │  │ VirtualGrid │  │    VirtualMasonry       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┴──────────────────────┘               │
│                          │                                       │
│                    ┌─────┴─────┐                                │
│                    │   Hooks   │                                │
│                    │ useVirtual│                                │
│                    └─────┬─────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    ┌─────┴─────┐           Plugin Layer          │
│                    │  Context  │                                 │
│                    └─────┬─────┘                                │
│    ┌─────────────────────┼─────────────────────┐                │
│    │                     │                     │                │
│ ┌──┴───┐  ┌──────┐  ┌───┴────┐  ┌────────┐  ┌┴────────┐       │
│ │ List │  │ Grid │  │ Auto   │  │Infinite│  │ Scroll  │       │
│ │Render│  │Render│  │Measure │  │ Loader │  │ Control │       │
│ └──────┘  └──────┘  └────────┘  └────────┘  └─────────┘       │
│   Core      Core       Core        Core         Core            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                   ┌─────┴─────┐          Kernel Layer           │
│                   │   KERNEL  │                                 │
│                   └─────┬─────┘                                 │
│     ┌──────────┬────────┼────────┬──────────┬────────┐         │
│     │          │        │        │          │        │         │
│ ┌───┴───┐ ┌────┴───┐ ┌──┴──┐ ┌──┴───┐ ┌────┴───┐ ┌──┴──┐     │
│ │Scroll │ │Viewport│ │Range│ │Measure│ │ Event  │ │Plugin│     │
│ │Engine │ │Manager │ │Calc │ │ Cache │ │  Bus   │ │ Reg  │     │
│ └───────┘ └────────┘ └─────┘ └───────┘ └────────┘ └─────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kernel Implementation

### 1. Scroll Engine (`scroll-engine.ts`)

Manages scroll position tracking and updates.

```typescript
interface ScrollEngineState {
  scrollTop: number
  scrollLeft: number
  previousScrollTop: number
  previousScrollLeft: number
  isScrolling: boolean
  scrollDirection: ScrollDirection
  lastScrollTime: number
}

class ScrollEngine {
  private state: ScrollEngineState
  private containerRef: HTMLElement | null
  private scrollEndTimer: number | null
  private rafId: number | null

  // Methods
  attach(container: HTMLElement): void
  detach(): void
  getScrollPosition(): ScrollPosition
  setScrollPosition(position: ScrollPosition): void
  scrollTo(offset: number, options?: ScrollOptions): void

  // Internal
  private handleScroll: (event: Event) => void
  private scheduleScrollEnd(): void
  private calculateDirection(): ScrollDirection
}
```

**Key Decisions:**
- Use native scroll events (not wheel events)
- Track scroll direction from delta
- Debounce scroll-end detection (150ms)
- Use RAF for position updates

### 2. Viewport Manager (`viewport.ts`)

Tracks container dimensions and resize events.

```typescript
interface ViewportState {
  width: number
  height: number
  scrollHeight: number
  scrollWidth: number
}

class ViewportManager {
  private state: ViewportState
  private containerRef: HTMLElement | null
  private resizeObserver: ResizeObserver | null

  // Methods
  attach(container: HTMLElement): void
  detach(): void
  getViewport(): Viewport
  measure(): Viewport

  // Internal
  private handleResize: (entries: ResizeObserverEntry[]) => void
}
```

**Key Decisions:**
- Use ResizeObserver (no fallback needed for target browsers)
- Throttle resize callbacks to 60fps
- Cache dimensions to avoid reflows

### 3. Range Calculator (`range-calculator.ts`)

Calculates visible item range using binary search.

```typescript
interface RangeCalculatorOptions {
  itemCount: number
  estimatedItemHeight: number
  overscan: number
}

class RangeCalculator {
  private options: RangeCalculatorOptions
  private heightCache: Map<number, number>
  private offsetCache: number[]  // Cumulative offsets

  // Methods
  getVisibleRange(scrollTop: number, viewportHeight: number): Range
  getTotalHeight(): number
  getItemOffset(index: number): number
  getItemAtOffset(offset: number): number

  // Cache management
  setItemHeight(index: number, height: number): void
  invalidate(index: number): void
  invalidateAll(): void
  rebuildOffsetCache(): void

  // Internal - Binary search
  private findStartIndex(scrollTop: number): number
  private findEndIndex(scrollBottom: number, startIndex: number): number
}
```

**Binary Search Algorithm:**
```typescript
private findStartIndex(scrollTop: number): number {
  let low = 0
  let high = this.options.itemCount - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const offset = this.getItemOffset(mid)
    const height = this.getItemHeight(mid)

    if (offset + height < scrollTop) {
      low = mid + 1
    } else if (offset > scrollTop) {
      high = mid - 1
    } else {
      return mid
    }
  }

  return Math.max(0, low)
}
```

**Key Decisions:**
- Maintain cumulative offset cache for O(1) offset lookups
- Rebuild offset cache only when heights change
- Use estimated height for unmeasured items

### 4. Measurement Cache (`measurement-cache.ts`)

Stores measured item heights.

```typescript
class MeasurementCache {
  private cache: Map<number, number>
  private estimatedHeight: number
  private totalMeasured: number
  private averageHeight: number

  // Methods
  get(index: number): number | undefined
  set(index: number, height: number): void
  has(index: number): boolean
  delete(index: number): void
  clear(): void

  // Stats
  getAverageHeight(): number
  getEstimatedHeight(): number
  getMeasuredCount(): number
}
```

**Key Decisions:**
- Use Map for O(1) lookups
- Track running average for better estimates
- Limit cache size for memory (configurable)

### 5. Event Bus (`event-bus.ts`)

Central event system for kernel communication.

```typescript
type EventHandler<T = unknown> = (event: T) => void

class EventBus {
  private handlers: Map<EventType, Set<EventHandler>>
  private emitting: boolean
  private pendingEvents: KernelEvent[]

  // Methods
  on<T extends KernelEvent>(type: T['type'], handler: EventHandler<T>): () => void
  off<T extends KernelEvent>(type: T['type'], handler: EventHandler<T>): void
  emit(event: KernelEvent): void
  once<T extends KernelEvent>(type: T['type'], handler: EventHandler<T>): () => void

  // Internal
  private flush(): void
}
```

**Key Decisions:**
- Return unsubscribe function from `on()`
- Queue events during emission to prevent recursion
- Use Set for handler deduplication

### 6. Plugin Registry (`plugin-registry.ts`)

Manages plugin lifecycle.

```typescript
class PluginRegistry {
  private plugins: Map<string, Plugin>
  private kernel: Kernel

  // Methods
  register(plugin: Plugin): void
  unregister(name: string): void
  get<T extends Plugin>(name: string): T | undefined
  list(): PluginInfo[]
  has(name: string): boolean

  // Hook dispatch
  dispatchHook(hookName: string, ...args: unknown[]): void

  // Internal
  private validatePlugin(plugin: Plugin): void
  private setupHooks(plugin: Plugin): void
  private teardownHooks(plugin: Plugin): void
}
```

**Key Decisions:**
- Plugins installed in registration order
- Core plugins auto-registered
- Hook dispatch is synchronous

---

## Core Plugin Implementations

### 1. List Renderer (`list-renderer.ts`)

```typescript
interface ListRendererState {
  virtualItems: VirtualItem[]
  startOffset: number
  endOffset: number
}

class ListRendererPlugin implements Plugin {
  name = 'list-renderer'
  version = '1.0.0'
  type = 'core' as const

  private kernel: Kernel
  private state: ListRendererState
  private itemPool: VirtualItem[]  // Object pooling

  install(kernel: Kernel): void
  uninstall(): void

  // API
  api = {
    getVirtualItems: () => this.state.virtualItems,
    getTotalHeight: () => this.kernel.getTotalSize(),
    getStartOffset: () => this.state.startOffset,
    getEndOffset: () => this.state.endOffset,
    isItemVisible: (index: number) => boolean,
  }

  // Hooks
  hooks = {
    onScroll: () => this.recalculate(),
    onResize: () => this.recalculate(),
    onItemMeasured: () => this.recalculate(),
  }

  private recalculate(): void {
    const range = this.kernel.getVisibleRange()
    this.state.virtualItems = this.buildVirtualItems(range)
  }

  private buildVirtualItems(range: Range): VirtualItem[] {
    const items: VirtualItem[] = []
    for (let i = range.overscanStartIndex; i <= range.overscanEndIndex; i++) {
      items.push(this.getPooledItem(i))
    }
    return items
  }

  // Object pooling
  private getPooledItem(index: number): VirtualItem
  private releaseItem(item: VirtualItem): void
}
```

### 2. Grid Renderer (`grid-renderer.ts`)

```typescript
interface GridRendererOptions {
  columns: number | 'auto'
  minColumnWidth: number
  gap: number | { x: number; y: number }
}

class GridRendererPlugin implements Plugin {
  name = 'grid-renderer'
  version = '1.0.0'
  type = 'core' as const

  private options: GridRendererOptions
  private columnCount: number
  private columnWidth: number

  // API
  api = {
    getVirtualItems: () => VirtualItem[],
    getTotalHeight: () => number,
    getColumnCount: () => this.columnCount,
    getColumnWidth: () => this.columnWidth,
    getItemsPerRow: () => this.columnCount,
  }

  private calculateColumns(containerWidth: number): void {
    if (this.options.columns === 'auto') {
      this.columnCount = Math.floor(
        (containerWidth + this.gap.x) / (this.options.minColumnWidth + this.gap.x)
      )
      this.columnWidth = (containerWidth - (this.columnCount - 1) * this.gap.x) / this.columnCount
    } else {
      this.columnCount = this.options.columns
      this.columnWidth = (containerWidth - (this.columnCount - 1) * this.gap.x) / this.columnCount
    }
  }
}
```

### 3. Auto Measurer (`auto-measurer.ts`)

```typescript
interface AutoMeasurerOptions {
  estimatedItemHeight: number
  measureOnResize: boolean
  debounceMs: number
}

class AutoMeasurerPlugin implements Plugin {
  name = 'auto-measurer'
  version = '1.0.0'
  type = 'core' as const

  private resizeObserver: ResizeObserver
  private observedElements: WeakMap<HTMLElement, number>
  private measureQueue: Set<number>
  private flushScheduled: boolean

  // API
  api = {
    measureElement: (index: number, element: HTMLElement) => number,
    getCachedSize: (index: number) => number | undefined,
    invalidate: (index: number) => void,
    invalidateAll: () => void,
    getMeasurementCache: () => Map<number, number>,
  }

  // Element measurement
  measureElement(index: number, element: HTMLElement): number {
    const height = element.getBoundingClientRect().height
    const previousHeight = this.kernel.getCachedHeight(index)

    if (previousHeight !== height) {
      this.kernel.emit({
        type: 'item-measured',
        index,
        height,
        previousHeight,
      })
    }

    return height
  }

  // ResizeObserver callback
  private handleResize = (entries: ResizeObserverEntry[]): void => {
    for (const entry of entries) {
      const index = this.observedElements.get(entry.target as HTMLElement)
      if (index !== undefined) {
        this.measureQueue.add(index)
      }
    }
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (!this.flushScheduled) {
      this.flushScheduled = true
      requestAnimationFrame(() => {
        this.flush()
        this.flushScheduled = false
      })
    }
  }
}
```

### 4. Infinite Loader (`infinite-loader.ts`)

```typescript
interface InfiniteLoaderOptions {
  threshold: number
  thresholdItems: number
  direction: 'forward' | 'backward' | 'both'
  onLoadMore: (direction: 'forward' | 'backward') => void | Promise<void>
}

class InfiniteLoaderPlugin implements Plugin {
  name = 'infinite-loader'
  version = '1.0.0'
  type = 'core' as const

  private loading: boolean = false
  private hasMore: boolean = true

  // API
  api = {
    isLoading: () => this.loading,
    setLoading: (loading: boolean) => { this.loading = loading },
    hasMore: () => this.hasMore,
    setHasMore: (hasMore: boolean) => { this.hasMore = hasMore },
    reset: () => { this.loading = false; this.hasMore = true },
  }

  // Hooks
  hooks = {
    onScroll: (event: ScrollEvent) => this.checkLoadMore(event),
    onVisibleRangeChange: (range: Range) => this.checkLoadMoreByItems(range),
  }

  private checkLoadMore(event: ScrollEvent): void {
    if (this.loading || !this.hasMore) return

    const viewport = this.kernel.getViewport()
    const totalHeight = this.kernel.getTotalSize()
    const { scrollTop } = event

    // Check forward (bottom)
    if (this.options.direction !== 'backward') {
      const distanceFromBottom = totalHeight - scrollTop - viewport.height
      if (distanceFromBottom < this.options.threshold) {
        this.triggerLoadMore('forward')
      }
    }

    // Check backward (top)
    if (this.options.direction !== 'forward') {
      if (scrollTop < this.options.threshold) {
        this.triggerLoadMore('backward')
      }
    }
  }

  private async triggerLoadMore(direction: 'forward' | 'backward'): Promise<void> {
    this.loading = true
    this.kernel.emit({ type: 'load-more', direction })

    try {
      await this.options.onLoadMore(direction)
    } finally {
      this.loading = false
    }
  }
}
```

### 5. Scroll Controller (`scroll-controller.ts`)

```typescript
interface ScrollAnimation {
  startTime: number
  startOffset: number
  targetOffset: number
  duration: number
  easing: EasingFunction
}

class ScrollControllerPlugin implements Plugin {
  name = 'scroll-controller'
  version = '1.0.0'
  type = 'core' as const

  private animation: ScrollAnimation | null = null
  private rafId: number | null = null

  // API
  api = {
    scrollTo: (offset: number, options?: ScrollOptions) => void,
    scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void,
    scrollToTop: (options?: ScrollOptions) => void,
    scrollToBottom: (options?: ScrollOptions) => void,
    getScrollPosition: () => ScrollPosition,
    isScrolling: () => boolean,
  }

  scrollTo(offset: number, options: ScrollOptions = {}): void {
    const { behavior = 'auto', duration = 300, easing = easings.easeInOut } = options

    if (behavior === 'auto') {
      this.kernel.setScrollPosition({ scrollTop: offset, scrollLeft: 0 })
    } else {
      this.animateScroll(offset, duration, easing)
    }
  }

  scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    const { align = 'auto', offset: additionalOffset = 0, ...scrollOptions } = options

    const itemOffset = this.kernel.getItemOffset(index)
    const itemHeight = this.kernel.getCachedHeight(index) ?? this.kernel.getEstimatedHeight()
    const viewport = this.kernel.getViewport()

    let targetOffset: number

    switch (align) {
      case 'start':
        targetOffset = itemOffset
        break
      case 'center':
        targetOffset = itemOffset - viewport.height / 2 + itemHeight / 2
        break
      case 'end':
        targetOffset = itemOffset - viewport.height + itemHeight
        break
      case 'auto':
      default:
        targetOffset = this.calculateAutoAlign(itemOffset, itemHeight, viewport.height)
        break
    }

    this.scrollTo(targetOffset + additionalOffset, scrollOptions)
  }

  private animateScroll(targetOffset: number, duration: number, easing: EasingFunction): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }

    const startOffset = this.kernel.getScrollPosition().scrollTop
    const startTime = performance.now()

    this.animation = { startTime, startOffset, targetOffset, duration, easing }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      const currentOffset = startOffset + (targetOffset - startOffset) * easedProgress

      this.kernel.setScrollPosition({ scrollTop: currentOffset, scrollLeft: 0 })

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate)
      } else {
        this.animation = null
        this.rafId = null
      }
    }

    this.rafId = requestAnimationFrame(animate)
  }
}

// Built-in easing functions
const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
}
```

---

## React Integration

### Context Setup

```typescript
// context.ts
interface ScrollexContextValue {
  kernel: Kernel
  containerRef: React.RefObject<HTMLElement>
}

const ScrollexContext = createContext<ScrollexContextValue | null>(null)

function ScrollexProvider({ children, kernel, containerRef }: ScrollexProviderProps) {
  const value = useMemo(() => ({ kernel, containerRef }), [kernel, containerRef])
  return <ScrollexContext.Provider value={value}>{children}</ScrollexContext.Provider>
}

function useScrollex(): Kernel | null {
  const context = useContext(ScrollexContext)
  return context?.kernel ?? null
}
```

### VirtualList Component

```typescript
// virtual-list.tsx
function VirtualList<T>({
  data,
  renderItem,
  itemHeight,
  estimatedItemHeight = 50,
  height = '100%',
  width = '100%',
  direction = 'vertical',
  overscan = 5,
  initialScrollOffset = 0,
  getItemKey,
  onLoadMore,
  hasMore,
  isLoading,
  loadingIndicator,
  threshold = 200,
  onScroll,
  onVisibleRangeChange,
  onItemsRendered,
  plugins = [],
  className,
  style,
  innerClassName,
  innerStyle,
  ...rest
}: VirtualListProps<T>, ref: React.ForwardedRef<VirtualListHandle>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const kernelRef = useRef<Kernel | null>(null)

  // Initialize kernel
  useEffect(() => {
    const kernel = createKernel({
      itemCount: data.length,
      estimatedItemHeight: itemHeight === 'auto' ? estimatedItemHeight : itemHeight,
      overscan,
    })

    // Register core plugins
    kernel.register(listRendererPlugin())
    kernel.register(autoMeasurerPlugin({ estimatedItemHeight }))
    kernel.register(scrollControllerPlugin())

    if (onLoadMore) {
      kernel.register(infiniteLoaderPlugin({
        threshold,
        onLoadMore,
      }))
    }

    // Register user plugins
    plugins.forEach(plugin => kernel.register(plugin))

    kernelRef.current = kernel

    return () => {
      kernel.destroy()
    }
  }, [])

  // Update item count
  useEffect(() => {
    kernelRef.current?.setItemCount(data.length)
  }, [data.length])

  // Use virtual list hook
  const {
    virtualItems,
    totalSize,
    measureElement,
    isScrolling,
  } = useVirtualList({
    count: data.length,
    getItemHeight: itemHeight === 'auto'
      ? undefined
      : () => itemHeight as number,
    estimatedItemHeight,
    overscan,
    containerRef,
  })

  // Imperative handle
  useImperativeHandle(ref, () => ({
    scrollTo: (offset, options) => kernelRef.current?.scrollTo(offset, options),
    scrollToIndex: (index, options) => kernelRef.current?.scrollToIndex(index, options),
    scrollToTop: (options) => kernelRef.current?.scrollTo(0, options),
    scrollToBottom: (options) => kernelRef.current?.scrollTo(totalSize, options),
    getScrollPosition: () => kernelRef.current?.getScrollPosition() ?? { scrollTop: 0, scrollLeft: 0 },
  }), [totalSize])

  return (
    <ScrollexProvider kernel={kernelRef.current!} containerRef={containerRef}>
      <div
        ref={containerRef}
        className={className}
        style={{
          height,
          width,
          overflow: 'auto',
          position: 'relative',
          ...style,
        }}
        {...rest}
      >
        <div
          className={innerClassName}
          style={{
            height: totalSize,
            width: '100%',
            position: 'relative',
            ...innerStyle,
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = data[virtualItem.index]
            if (!item) return null

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {renderItem({
                  item,
                  index: virtualItem.index,
                  style: { height: virtualItem.size },
                  measureRef: (el) => el && measureElement(virtualItem.index, el),
                  isVisible: virtualItem.index >= kernelRef.current!.getVisibleRange().startIndex,
                  isScrolling,
                })}
              </div>
            )
          })}
        </div>
        {isLoading && loadingIndicator}
      </div>
    </ScrollexProvider>
  )
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> }
) => React.ReactElement
```

---

## Performance Optimizations

### 1. Object Pooling

```typescript
class ObjectPool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (item: T) => void

  constructor(factory: () => T, reset: (item: T) => void, initialSize = 50) {
    this.factory = factory
    this.reset = reset

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory())
    }
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory()
  }

  release(item: T): void {
    this.reset(item)
    this.pool.push(item)
  }
}

// Usage in list renderer
const virtualItemPool = new ObjectPool<VirtualItem>(
  () => ({ index: 0, key: 0, start: 0, end: 0, size: 0, lane: 0 }),
  (item) => {
    item.index = 0
    item.key = 0
    item.start = 0
    item.end = 0
    item.size = 0
    item.lane = 0
  }
)
```

### 2. Throttled Scroll Handler

```typescript
function createThrottledHandler(
  handler: (event: ScrollEvent) => void,
  fps: number = 60
): (event: Event) => void {
  const frameTime = 1000 / fps
  let lastTime = 0
  let rafId: number | null = null

  return (event: Event) => {
    const now = performance.now()

    if (rafId) {
      return // Already scheduled
    }

    const timeSinceLastCall = now - lastTime
    const delay = Math.max(0, frameTime - timeSinceLastCall)

    rafId = requestAnimationFrame(() => {
      lastTime = performance.now()
      rafId = null
      handler(createScrollEvent(event))
    })
  }
}
```

### 3. Batched DOM Updates

```typescript
class DOMBatcher {
  private reads: (() => void)[] = []
  private writes: (() => void)[] = []
  private scheduled = false

  read(fn: () => void): void {
    this.reads.push(fn)
    this.schedule()
  }

  write(fn: () => void): void {
    this.writes.push(fn)
    this.schedule()
  }

  private schedule(): void {
    if (this.scheduled) return
    this.scheduled = true

    requestAnimationFrame(() => {
      // Execute all reads first
      const reads = this.reads.splice(0)
      reads.forEach(fn => fn())

      // Then all writes
      const writes = this.writes.splice(0)
      writes.forEach(fn => fn())

      this.scheduled = false
    })
  }
}
```

### 4. Offset Cache Strategy

```typescript
class OffsetCache {
  private offsets: number[] = []
  private dirtyFrom: number = 0
  private heights: (index: number) => number

  constructor(itemCount: number, heights: (index: number) => number) {
    this.heights = heights
    this.offsets = new Array(itemCount + 1)
    this.rebuild()
  }

  getOffset(index: number): number {
    this.ensureValid(index)
    return this.offsets[index] ?? 0
  }

  invalidateFrom(index: number): void {
    this.dirtyFrom = Math.min(this.dirtyFrom, index)
  }

  private ensureValid(upToIndex: number): void {
    if (this.dirtyFrom <= upToIndex) {
      // Rebuild only dirty portion
      let offset = this.offsets[this.dirtyFrom] ?? 0
      for (let i = this.dirtyFrom; i <= upToIndex; i++) {
        this.offsets[i] = offset
        offset += this.heights(i)
      }
      this.dirtyFrom = upToIndex + 1
    }
  }

  private rebuild(): void {
    this.dirtyFrom = 0
    this.ensureValid(this.offsets.length - 1)
  }
}
```

---

## CSS Containment

```typescript
// Styles applied to container
const containerStyles: React.CSSProperties = {
  contain: 'strict',
  overflow: 'auto',
  position: 'relative',
}

// Styles applied to inner wrapper
const innerStyles: React.CSSProperties = {
  contain: 'size layout',
  position: 'relative',
}

// Styles applied to items
const itemStyles: React.CSSProperties = {
  contain: 'layout style',
  position: 'absolute',
  willChange: 'transform',
}
```

---

## Memory Management

### WeakMap for Element References

```typescript
class ElementRegistry {
  private elements = new WeakMap<HTMLElement, number>()
  private indices = new Map<number, WeakRef<HTMLElement>>()

  register(element: HTMLElement, index: number): void {
    this.elements.set(element, index)
    this.indices.set(index, new WeakRef(element))
  }

  unregister(element: HTMLElement): void {
    const index = this.elements.get(element)
    if (index !== undefined) {
      this.elements.delete(element)
      this.indices.delete(index)
    }
  }

  getIndex(element: HTMLElement): number | undefined {
    return this.elements.get(element)
  }

  getElement(index: number): HTMLElement | undefined {
    return this.indices.get(index)?.deref()
  }
}
```

### Cache Size Limits

```typescript
class BoundedCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  get(key: K): V | undefined {
    return this.cache.get(key)
  }
}
```

---

## Error Handling Patterns

```typescript
function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[Scrollex] ${message}`)
  }
}

function warning(condition: boolean, message: string): void {
  if (!condition && process.env.NODE_ENV !== 'production') {
    console.warn(`[Scrollex] ${message}`)
  }
}

// Usage
invariant(
  itemHeight === 'auto' || typeof itemHeight === 'number',
  'itemHeight must be a number or "auto"'
)

warning(
  getItemKey !== undefined,
  'getItemKey is recommended for optimal performance'
)
```

---

## Testing Strategy

### Unit Test Examples

```typescript
describe('RangeCalculator', () => {
  it('finds correct start index with binary search', () => {
    const calc = new RangeCalculator({
      itemCount: 1000,
      estimatedItemHeight: 50,
      overscan: 5,
    })

    // Set some known heights
    calc.setItemHeight(0, 100)
    calc.setItemHeight(1, 50)
    calc.setItemHeight(2, 75)

    const range = calc.getVisibleRange(150, 500)
    expect(range.startIndex).toBe(2)
  })

  it('calculates total height correctly', () => {
    const calc = new RangeCalculator({
      itemCount: 100,
      estimatedItemHeight: 50,
      overscan: 0,
    })

    expect(calc.getTotalHeight()).toBe(5000)

    calc.setItemHeight(0, 100)
    expect(calc.getTotalHeight()).toBe(5050)
  })
})
```

### Integration Test Examples

```typescript
describe('VirtualList', () => {
  it('renders only visible items', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }))

    render(
      <VirtualList
        data={items}
        itemHeight={50}
        height={500}
        renderItem={({ item, style }) => (
          <div style={style} data-testid={`item-${item.id}`}>
            Item {item.id}
          </div>
        )}
      />
    )

    // Should render ~10 visible + overscan items
    const renderedItems = screen.getAllByTestId(/^item-/)
    expect(renderedItems.length).toBeLessThan(30)
  })

  it('calls onLoadMore when scrolling near bottom', async () => {
    const onLoadMore = vi.fn()
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i }))

    render(
      <VirtualList
        data={items}
        itemHeight={50}
        height={500}
        onLoadMore={onLoadMore}
        hasMore={true}
        threshold={200}
        renderItem={({ item, style }) => (
          <div style={style}>Item {item.id}</div>
        )}
      />
    )

    // Scroll near bottom
    fireEvent.scroll(screen.getByRole('listbox'), {
      target: { scrollTop: 4500 },
    })

    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalled()
    })
  })
})
```

### Performance Test Examples

```typescript
describe('Performance', () => {
  it('maintains 60fps during scroll', async () => {
    const items = Array.from({ length: 100000 }, (_, i) => ({ id: i }))
    const frameTimes: number[] = []

    render(
      <VirtualList
        data={items}
        itemHeight={50}
        height={500}
        onScroll={() => {
          frameTimes.push(performance.now())
        }}
        renderItem={({ item, style }) => (
          <div style={style}>Item {item.id}</div>
        )}
      />
    )

    // Simulate rapid scrolling
    const container = screen.getByRole('listbox')
    for (let i = 0; i < 100; i++) {
      fireEvent.scroll(container, {
        target: { scrollTop: i * 100 },
      })
      await new Promise(r => setTimeout(r, 16))
    }

    // Check frame times
    for (let i = 1; i < frameTimes.length; i++) {
      const frameTime = frameTimes[i] - frameTimes[i - 1]
      expect(frameTime).toBeLessThan(20) // Allow some margin
    }
  })
})
```
