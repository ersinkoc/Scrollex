# Scrollex - Zero-Dependency React Virtualization Library

## Package Identity

- **NPM Package**: `@oxog/scrollex`
- **GitHub Repository**: `https://github.com/ersinkoc/scrollex`
- **Documentation Site**: `https://scrollex.oxog.dev`
- **License**: MIT
- **Author**: ersinkoc

**NO social media, Discord, email, or external links.**

## Package Description

Zero-dependency React virtualization library with micro-kernel plugin architecture.

Scrollex is a high-performance virtualization toolkit for React that efficiently renders large lists, grids, and masonry layouts by only rendering visible items. Built on a micro-kernel architecture with a powerful plugin system, it provides auto-measurement for variable heights, infinite scrolling, bidirectional scroll for chat apps, sticky headers, keyboard navigation, and more—all without any runtime dependencies.

---

## NON-NEGOTIABLE RULES

These rules are ABSOLUTE and must be followed without exception:

### 1. ZERO DEPENDENCIES
```json
{
  "dependencies": {}  // MUST BE EMPTY - NO EXCEPTIONS
}
```
Implement EVERYTHING from scratch. No runtime dependencies allowed.

### 2. 100% TEST COVERAGE
- Every line of code must be tested
- Every branch must be tested
- All tests must pass (100% success rate)
- Use Vitest for testing

### 3. DEVELOPMENT WORKFLOW
Create these documents FIRST, before any code:
1. **SPECIFICATION.md** - Complete package specification
2. **IMPLEMENTATION.md** - Architecture and design decisions
3. **TASKS.md** - Ordered task list with dependencies

Only after these documents are complete, implement the code following TASKS.md sequentially.

### 4. TYPESCRIPT STRICT MODE
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 5. NO EXTERNAL LINKS
- ❌ No social media (Twitter, LinkedIn, etc.)
- ❌ No Discord/Slack links
- ❌ No email addresses
- ❌ No donation/sponsor links
- ✅ Only GitHub repo and documentation site allowed

---

## ARCHITECTURE: MICRO-KERNEL + PLUGIN SYSTEM

### Kernel Responsibilities

```typescript
interface Kernel {
  // Plugin management
  register(plugin: Plugin): void
  unregister(pluginName: string): void
  getPlugin<T extends Plugin>(name: string): T | undefined
  listPlugins(): PluginInfo[]
  
  // Scroll engine
  getScrollPosition(): ScrollPosition
  setScrollPosition(position: ScrollPosition): void
  scrollTo(offset: number, behavior?: ScrollBehavior): void
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void
  
  // Viewport
  getViewport(): Viewport
  getVisibleRange(): Range
  
  // Measurement
  measureItem(index: number): number
  getCachedHeight(index: number): number | undefined
  invalidateMeasurement(index: number): void
  invalidateAllMeasurements(): void
  
  // Event system
  emit(event: KernelEvent): void
  on(eventType: EventType, handler: EventHandler): Unsubscribe
  off(eventType: EventType, handler: EventHandler): void
  
  // Configuration
  configure(options: KernelOptions): void
}

interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
}

interface Viewport {
  width: number
  height: number
  scrollHeight: number
  scrollWidth: number
}

interface Range {
  startIndex: number
  endIndex: number
  overscanStartIndex: number
  overscanEndIndex: number
}

interface ScrollToIndexOptions {
  align: 'start' | 'center' | 'end' | 'auto'
  behavior: 'auto' | 'smooth'
  offset: number
}
```

### Plugin Interface

```typescript
interface Plugin {
  // Identity
  name: string
  version: string
  type: 'core' | 'optional'
  
  // Lifecycle
  install(kernel: Kernel): void
  uninstall(): void
  
  // Hooks (all optional)
  hooks?: {
    onScroll?: (event: ScrollEvent) => void
    onVisibleRangeChange?: (range: Range) => void
    onItemMeasured?: (index: number, height: number) => void
    onResize?: (viewport: Viewport) => void
    onLoadMore?: (direction: 'forward' | 'backward') => void
    onItemsChange?: (count: number) => void
  }
  
  // Plugin can expose its own API
  api?: Record<string, unknown>
}

interface PluginInfo {
  name: string
  version: string
  type: 'core' | 'optional'
  enabled: boolean
}
```

### Event Types

```typescript
type EventType =
  | 'scroll'
  | 'visible-range-change'
  | 'item-measured'
  | 'resize'
  | 'load-more'
  | 'items-change'
  | 'scroll-to-index'

type KernelEvent =
  | ScrollEvent
  | VisibleRangeChangeEvent
  | ItemMeasuredEvent
  | ResizeEvent
  | LoadMoreEvent
  | ItemsChangeEvent

interface ScrollEvent {
  type: 'scroll'
  scrollTop: number
  scrollLeft: number
  deltaY: number
  deltaX: number
  direction: 'up' | 'down' | 'left' | 'right'
  timestamp: number
}

interface VisibleRangeChangeEvent {
  type: 'visible-range-change'
  range: Range
  previousRange: Range
}

interface ItemMeasuredEvent {
  type: 'item-measured'
  index: number
  height: number
  previousHeight: number | undefined
}

interface ResizeEvent {
  type: 'resize'
  viewport: Viewport
  previousViewport: Viewport
}

interface LoadMoreEvent {
  type: 'load-more'
  direction: 'forward' | 'backward'
  threshold: number
}
```

---

## CORE PLUGINS (5 Total - Always Loaded)

### 1. list-renderer

Core list virtualization engine.

```typescript
interface ListRendererAPI {
  getVirtualItems(): VirtualItem[]
  getTotalHeight(): number
  getStartOffset(): number
  getEndOffset(): number
  isItemVisible(index: number): boolean
}

interface VirtualItem {
  index: number
  key: string | number
  start: number      // Offset from top
  end: number        // Offset + height
  size: number       // Height
  lane: number       // For grid/masonry (column index)
}

interface ListRendererOptions {
  direction: 'vertical' | 'horizontal'
  overscan: number   // Extra items to render outside viewport
  initialScrollOffset: number
  getItemKey?: (index: number) => string | number
}
```

### 2. grid-renderer

Multi-column grid virtualization.

```typescript
interface GridRendererAPI {
  getVirtualItems(): VirtualItem[]
  getTotalHeight(): number
  getColumnCount(): number
  getColumnWidth(): number
  getItemsPerRow(): number
}

interface GridRendererOptions {
  columns: number | 'auto'
  minColumnWidth?: number   // For auto columns
  gap: number | { x: number; y: number }
  aspectRatio?: number      // For fixed aspect ratio items
}
```

### 3. auto-measurer

Automatic item height measurement.

```typescript
interface AutoMeasurerAPI {
  measureElement(index: number, element: HTMLElement): number
  getCachedSize(index: number): number | undefined
  invalidate(index: number): void
  invalidateAll(): void
  getMeasurementCache(): Map<number, number>
}

interface AutoMeasurerOptions {
  estimatedItemHeight: number
  measureOnResize: boolean
  debounceMs: number
}

// Usage in renderItem
renderItem={({ item, index, measureRef }) => (
  <div ref={measureRef}>
    {/* Variable height content */}
  </div>
)}
```

**Implementation Notes:**
- Uses ResizeObserver for automatic re-measurement
- Caches measurements for performance
- Supports dynamic content changes
- Debounces rapid size changes

### 4. infinite-loader

Infinite scroll with load more detection.

```typescript
interface InfiniteLoaderAPI {
  isLoading(): boolean
  setLoading(loading: boolean): void
  hasMore(): boolean
  setHasMore(hasMore: boolean): void
  reset(): void
}

interface InfiniteLoaderOptions {
  threshold: number          // Pixels from edge to trigger
  thresholdItems: number     // Items from edge to trigger
  direction: 'forward' | 'backward' | 'both'
  loadingIndicator?: React.ReactNode
  onLoadMore: (direction: 'forward' | 'backward') => void | Promise<void>
}
```

### 5. scroll-controller

Programmatic scroll control.

```typescript
interface ScrollControllerAPI {
  scrollTo(offset: number, options?: ScrollOptions): void
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void
  scrollToTop(options?: ScrollOptions): void
  scrollToBottom(options?: ScrollOptions): void
  getScrollPosition(): ScrollPosition
  isScrolling(): boolean
}

interface ScrollOptions {
  behavior: 'auto' | 'smooth'
  duration?: number          // For custom smooth scroll
  easing?: EasingFunction
}

interface ScrollToIndexOptions extends ScrollOptions {
  align: 'start' | 'center' | 'end' | 'auto'
  offset?: number            // Additional offset
}

type EasingFunction = (t: number) => number

// Built-in easings
const easings = {
  linear: (t) => t,
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOut: (t) => t * (2 - t),
  easeIn: (t) => t * t,
}
```

---

## OPTIONAL PLUGINS (7 Total - Import Separately)

### 6. masonry-renderer

Pinterest-style masonry layout.

```typescript
import { masonryRenderer } from '@oxog/scrollex/plugins'

<VirtualMasonry
  data={images}
  columns={3}
  gap={8}
  plugins={[masonryRenderer()]}
  renderItem={({ item, width }) => (
    <Image src={item.url} width={width} height={item.height} />
  )}
/>

interface MasonryRendererAPI {
  getVirtualItems(): VirtualItem[]
  getTotalHeight(): number
  getColumnHeights(): number[]
  getShortestColumn(): number
  getLongestColumn(): number
}

interface MasonryRendererOptions {
  columns: number | 'auto'
  minColumnWidth?: number
  gap: number
  getItemHeight: (item: unknown, columnWidth: number) => number
}
```

**Implementation Notes:**
- Places items in shortest column
- Handles variable heights naturally
- Recalculates on column count change
- Supports responsive columns

### 7. sticky-headers

Sticky group headers for grouped lists.

```typescript
import { stickyHeaders } from '@oxog/scrollex/plugins'

interface GroupedItem {
  type: 'header' | 'item'
  groupId: string
  data: unknown
}

<VirtualList
  data={groupedItems}
  plugins={[stickyHeaders({
    headerHeight: 40,
    zIndex: 10,
  })]}
  renderItem={({ item }) => 
    item.type === 'header' 
      ? <Header>{item.data.title}</Header>
      : <Row item={item.data} />
  }
/>

interface StickyHeadersAPI {
  getCurrentStickyHeader(): number | null
  getGroupForIndex(index: number): string
  scrollToGroup(groupId: string): void
}

interface StickyHeadersOptions {
  headerHeight: number | ((groupId: string) => number)
  isHeader: (item: unknown, index: number) => boolean
  getGroupId: (item: unknown, index: number) => string
  zIndex: number
  stickyOffset: number    // Offset from top
}
```

### 8. keyboard-nav

Keyboard navigation for accessibility.

```typescript
import { keyboardNav } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  plugins={[keyboardNav({
    loop: true,
    orientation: 'vertical',
  })]}
  onSelect={(index) => handleSelect(index)}
  onFocus={(index) => handleFocus(index)}
/>

interface KeyboardNavAPI {
  getFocusedIndex(): number | null
  setFocusedIndex(index: number): void
  focusNext(): void
  focusPrevious(): void
  focusFirst(): void
  focusLast(): void
  selectFocused(): void
}

interface KeyboardNavOptions {
  enabled: boolean
  loop: boolean                    // Wrap around at ends
  orientation: 'vertical' | 'horizontal' | 'grid'
  pageSize: number                 // Items to skip on PageUp/PageDown
  typeahead: boolean               // Type to search
  typeaheadTimeout: number         // Reset search after ms
  onFocus?: (index: number) => void
  onSelect?: (index: number) => void
  onKeyDown?: (event: KeyboardEvent, index: number) => void
}

// Supported keys:
// - ArrowUp/ArrowDown (vertical)
// - ArrowLeft/ArrowRight (horizontal/grid)
// - Home/End (first/last)
// - PageUp/PageDown (jump)
// - Enter/Space (select)
// - Type characters (typeahead search)
```

### 9. scroll-restoration

Scroll position persistence and restoration.

```typescript
import { scrollRestoration } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  plugins={[scrollRestoration({
    key: 'my-list',
    storage: 'sessionStorage',
  })]}
/>

interface ScrollRestorationAPI {
  save(): void
  restore(): void
  clear(): void
  getSavedPosition(): ScrollPosition | null
}

interface ScrollRestorationOptions {
  key: string                              // Storage key
  storage: 'sessionStorage' | 'localStorage' | Storage
  restoreOnMount: boolean
  saveOnUnmount: boolean
  saveOnScroll: boolean                    // Debounced
  debounceMs: number
  includeIndex: boolean                    // Save focused index too
}
```

### 10. bidirectional

Bidirectional scrolling for chat apps.

```typescript
import { bidirectional } from '@oxog/scrollex/plugins'

<VirtualList
  data={messages}
  itemHeight="auto"
  plugins={[bidirectional({
    stickToBottom: true,
    initialPosition: 'bottom',
  })]}
  onLoadMore={(direction) => {
    if (direction === 'backward') loadOlderMessages()
    if (direction === 'forward') loadNewerMessages()
  }}
/>

interface BidirectionalAPI {
  isAtBottom(): boolean
  isAtTop(): boolean
  scrollToBottom(options?: ScrollOptions): void
  scrollToTop(options?: ScrollOptions): void
  setStickToBottom(stick: boolean): void
  isStickingToBottom(): boolean
}

interface BidirectionalOptions {
  initialPosition: 'top' | 'bottom'
  stickToBottom: boolean              // Auto-scroll on new items
  stickThreshold: number              // Pixels from bottom to stick
  maintainPositionOnPrepend: boolean  // Keep position when adding to top
  onLoadMore?: (direction: 'forward' | 'backward') => void
}
```

**Implementation Notes:**
- Maintains scroll position when prepending items
- Auto-scrolls to bottom on new messages (if sticking)
- Supports loading older messages (backward scroll)
- Handles dynamic height messages

### 11. drag-to-reorder

Drag and drop reordering.

```typescript
import { dragToReorder } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  plugins={[dragToReorder({
    onReorder: (fromIndex, toIndex) => {
      const reordered = reorderArray(items, fromIndex, toIndex)
      setItems(reordered)
    },
  })]}
  renderItem={({ item, index, dragHandleProps }) => (
    <Row item={item}>
      <DragHandle {...dragHandleProps} />
    </Row>
  )}
/>

interface DragToReorderAPI {
  isDragging(): boolean
  getDraggedIndex(): number | null
  getDropTargetIndex(): number | null
  cancelDrag(): void
}

interface DragToReorderOptions {
  enabled: boolean
  axis: 'vertical' | 'horizontal'
  handle: boolean                     // Require drag handle
  autoScroll: boolean                 // Scroll while dragging near edges
  autoScrollSpeed: number
  dropIndicator: 'line' | 'gap' | 'none'
  onDragStart?: (index: number) => void
  onDragEnd?: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  canDrag?: (index: number) => boolean
  canDrop?: (fromIndex: number, toIndex: number) => boolean
}
```

### 12. debug-panel

Visual debugging panel.

```typescript
import { debugPanel, DebugPanel } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  plugins={[debugPanel()]}
/>
<DebugPanel position="bottom-right" shortcut="ctrl+shift+v" />

interface DebugPanelAPI {
  open(): void
  close(): void
  toggle(): void
  isOpen(): boolean
}

interface DebugPanelOptions {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  shortcut: string
  draggable: boolean
  resizable: boolean
  theme: 'dark' | 'light' | 'auto'
}
```

**Debug Panel Shows:**
- Current scroll position
- Visible range (start/end index)
- Total items count
- Rendered items count
- Viewport dimensions
- Total scroll height
- Average item height
- Measurement cache size
- FPS counter
- Memory usage
- Visual viewport indicator
- Item boundaries overlay

---

## PUBLIC API

### React Components

```tsx
// Virtual List
import { VirtualList } from '@oxog/scrollex'

<VirtualList
  data={items}
  itemHeight={50}                    // Fixed height
  // OR
  itemHeight="auto"                  // Variable height
  estimatedItemHeight={60}           // For auto measurement
  
  renderItem={({ item, index, measureRef, style }) => (
    <div ref={measureRef} style={style}>
      <ItemContent item={item} />
    </div>
  )}
  
  // Optional props
  height={400}                       // Container height (or use CSS)
  width="100%"                       // Container width
  direction="vertical"               // or 'horizontal'
  overscan={5}                       // Extra items to render
  initialScrollOffset={0}
  getItemKey={(index) => items[index].id}
  
  // Infinite scroll
  onLoadMore={loadMore}
  hasMore={hasNextPage}
  isLoading={isLoading}
  loadingIndicator={<Spinner />}
  
  // Events
  onScroll={(scrollTop) => {}}
  onVisibleRangeChange={(range) => {}}
  onItemsRendered={({ startIndex, endIndex }) => {}}
  
  // Plugins
  plugins={[stickyHeaders(), keyboardNav()]}
  
  // Ref
  ref={listRef}
/>

// Virtual Grid
import { VirtualGrid } from '@oxog/scrollex'

<VirtualGrid
  data={products}
  columns={4}                        // Fixed columns
  // OR
  columns="auto"                     // Responsive
  minColumnWidth={200}               // For auto columns
  
  itemHeight={200}                   // Row height
  gap={16}                           // Gap between items
  // OR
  gap={{ x: 16, y: 24 }}
  
  renderItem={({ item, index, columnIndex, style }) => (
    <div style={style}>
      <ProductCard product={item} />
    </div>
  )}
  
  // ... same optional props as VirtualList
/>

// Virtual Masonry
import { VirtualMasonry } from '@oxog/scrollex'

<VirtualMasonry
  data={images}
  columns={3}
  gap={8}
  
  getItemHeight={(item, columnWidth) => {
    // Calculate height based on aspect ratio
    return (item.height / item.width) * columnWidth
  }}
  
  renderItem={({ item, index, columnIndex, width, style }) => (
    <div style={style}>
      <Image
        src={item.url}
        width={width}
        height={(item.height / item.width) * width}
      />
    </div>
  )}
/>
```

### React Hooks

```tsx
import {
  useVirtualList,
  useVirtualGrid,
  useVirtualMasonry,
  useScrollex,
} from '@oxog/scrollex'

// List hook
function MyList({ items }) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    virtualItems,
    totalHeight,
    scrollTo,
    scrollToIndex,
    measureElement,
    isScrolling,
  } = useVirtualList({
    count: items.length,
    getItemHeight: (index) => items[index].height ?? 50,
    estimatedItemHeight: 50,
    overscan: 5,
    containerRef,
  })
  
  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
              width: '100%',
            }}
          >
            <ItemContent item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Grid hook
const {
  virtualItems,
  totalHeight,
  columnCount,
  columnWidth,
} = useVirtualGrid({
  count: items.length,
  columns: 4,
  itemHeight: 200,
  gap: 16,
  containerRef,
})

// Access kernel directly
function AdvancedUsage() {
  const kernel = useScrollex()
  
  const handleJumpTo = (index: number) => {
    kernel.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
  }
}
```

### Programmatic API

```tsx
import {
  getKernel,
  createPlugin,
  scrollTo,
  scrollToIndex,
} from '@oxog/scrollex'

// Access kernel
const kernel = getKernel()

// Create custom plugin
const analyticsPlugin = createPlugin({
  name: 'analytics',
  version: '1.0.0',
  type: 'optional',
  hooks: {
    onScroll: (event) => {
      analytics.track('scroll', { position: event.scrollTop })
    },
    onVisibleRangeChange: (range) => {
      analytics.track('visible_items', {
        start: range.startIndex,
        end: range.endIndex,
      })
    },
  },
})
```

---

## TYPE DEFINITIONS

```typescript
// Core types
export interface VirtualItem {
  index: number
  key: string | number
  start: number
  end: number
  size: number
  lane: number
}

export interface Range {
  startIndex: number
  endIndex: number
  overscanStartIndex: number
  overscanEndIndex: number
}

export interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
}

export interface Viewport {
  width: number
  height: number
  scrollHeight: number
  scrollWidth: number
}

// Component Props
export interface VirtualListProps<T> {
  data: T[]
  itemHeight: number | 'auto'
  estimatedItemHeight?: number
  renderItem: (props: RenderItemProps<T>) => React.ReactNode
  height?: number | string
  width?: number | string
  direction?: 'vertical' | 'horizontal'
  overscan?: number
  initialScrollOffset?: number
  getItemKey?: (index: number) => string | number
  onLoadMore?: () => void | Promise<void>
  hasMore?: boolean
  isLoading?: boolean
  loadingIndicator?: React.ReactNode
  onScroll?: (scrollTop: number) => void
  onVisibleRangeChange?: (range: Range) => void
  onItemsRendered?: (info: ItemsRenderedInfo) => void
  plugins?: Plugin[]
  className?: string
  style?: React.CSSProperties
}

export interface RenderItemProps<T> {
  item: T
  index: number
  style: React.CSSProperties
  measureRef: React.RefCallback<HTMLElement>
  isVisible: boolean
  isScrolling: boolean
}

export interface VirtualGridProps<T> extends Omit<VirtualListProps<T>, 'itemHeight'> {
  columns: number | 'auto'
  minColumnWidth?: number
  itemHeight: number
  gap?: number | { x: number; y: number }
  renderItem: (props: GridRenderItemProps<T>) => React.ReactNode
}

export interface GridRenderItemProps<T> extends RenderItemProps<T> {
  columnIndex: number
  rowIndex: number
}

export interface VirtualMasonryProps<T> extends Omit<VirtualGridProps<T>, 'itemHeight'> {
  getItemHeight: (item: T, columnWidth: number) => number
  renderItem: (props: MasonryRenderItemProps<T>) => React.ReactNode
}

export interface MasonryRenderItemProps<T> extends GridRenderItemProps<T> {
  width: number
}

// Hook return types
export interface UseVirtualListReturn {
  virtualItems: VirtualItem[]
  totalHeight: number
  scrollTo: (offset: number, options?: ScrollOptions) => void
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  measureElement: (index: number, element: HTMLElement) => void
  isScrolling: boolean
  visibleRange: Range
}

// Plugin types
export interface Plugin {
  name: string
  version: string
  type: 'core' | 'optional'
  install(kernel: Kernel): void
  uninstall(): void
  hooks?: PluginHooks
  api?: Record<string, unknown>
}

export interface PluginHooks {
  onScroll?: (event: ScrollEvent) => void
  onVisibleRangeChange?: (range: Range) => void
  onItemMeasured?: (index: number, height: number) => void
  onResize?: (viewport: Viewport) => void
  onLoadMore?: (direction: 'forward' | 'backward') => void
  onItemsChange?: (count: number) => void
}

// Event types
export type KernelEvent =
  | ScrollEvent
  | VisibleRangeChangeEvent
  | ItemMeasuredEvent
  | ResizeEvent
  | LoadMoreEvent

// Options types
export interface ScrollOptions {
  behavior?: 'auto' | 'smooth'
  duration?: number
}

export interface ScrollToIndexOptions extends ScrollOptions {
  align?: 'start' | 'center' | 'end' | 'auto'
  offset?: number
}
```

---

## PERFORMANCE REQUIREMENTS

### Targets
- **100,000+ items** - Smooth scroll with no lag
- **60 FPS** - Consistent frame rate during scroll
- **< 16ms** - Frame budget for scroll handlers
- **< 100ms** - Initial render time
- **< 50MB** - Memory usage for 100k items

### Optimization Strategies

```typescript
// 1. Binary search for visible range
function getVisibleRange(scrollTop: number, heights: number[]): Range {
  const startIndex = binarySearch(heights, scrollTop)
  // ...
}

// 2. Measurement caching
const measurementCache = new Map<number, number>()

// 3. Throttled scroll handling
const handleScroll = throttle((event) => {
  // Update visible range
}, 16) // ~60fps

// 4. requestAnimationFrame for smooth updates
function updateVisibleItems() {
  requestAnimationFrame(() => {
    // Batch DOM updates
  })
}

// 5. Object pooling for virtual items
const itemPool: VirtualItem[] = []

// 6. Avoid layout thrashing
function measureItems(indices: number[]) {
  // Read all dimensions first
  const dimensions = indices.map(i => elements[i].getBoundingClientRect())
  // Then write
  dimensions.forEach((dim, i) => cache.set(indices[i], dim.height))
}
```

### Memory Management

- Only store heights, not full item data
- Use WeakMap for element references
- Clear measurement cache on unmount
- Limit history/cache sizes
- Use `will-change: transform` sparingly

---

## TECHNICAL REQUIREMENTS

- **Runtime**: Browser only
- **React Version**: 17+ (hooks required)
- **Module Format**: ESM + CJS (dual package)
- **Node.js Version**: >= 18 (for build/test)
- **TypeScript Version**: >= 5.0, strict mode

### Browser APIs Used

- `ResizeObserver` - Container and item resize detection
- `IntersectionObserver` - Visibility detection (optional optimization)
- `requestAnimationFrame` - Smooth scroll updates
- `requestIdleCallback` - Background measurement
- `performance.now()` - High-resolution timing
- `scrollTo` - Native smooth scrolling
- CSS `contain: strict` - Layout containment

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./plugins": {
      "import": "./dist/plugins/index.js",
      "require": "./dist/plugins/index.cjs"
    }
  }
}
```

---

## PROJECT STRUCTURE

```
scrollex/
├── src/
│   ├── index.ts                    # Main entry, exports
│   ├── types.ts                    # All type definitions
│   │
│   ├── kernel/                     # Micro-kernel core
│   │   ├── index.ts
│   │   ├── kernel.ts               # Kernel implementation
│   │   ├── scroll-engine.ts        # Scroll position tracking
│   │   ├── viewport.ts             # Viewport calculations
│   │   ├── range-calculator.ts     # Visible range calculation
│   │   ├── measurement-cache.ts    # Height caching
│   │   ├── event-bus.ts            # Event system
│   │   └── plugin-registry.ts      # Plugin management
│   │
│   ├── plugins/                    # All plugins
│   │   ├── index.ts                # Optional plugins export
│   │   ├── core/                   # Core plugins (bundled)
│   │   │   ├── index.ts
│   │   │   ├── list-renderer.ts
│   │   │   ├── grid-renderer.ts
│   │   │   ├── auto-measurer.ts
│   │   │   ├── infinite-loader.ts
│   │   │   └── scroll-controller.ts
│   │   │
│   │   └── optional/               # Optional plugins
│   │       ├── index.ts
│   │       ├── masonry-renderer.ts
│   │       ├── sticky-headers.ts
│   │       ├── keyboard-nav.ts
│   │       ├── scroll-restoration.ts
│   │       ├── bidirectional.ts
│   │       ├── drag-to-reorder/
│   │       │   ├── index.ts
│   │       │   ├── drag-to-reorder.ts
│   │       │   └── drag-indicator.tsx
│   │       └── debug-panel/
│   │           ├── index.ts
│   │           ├── panel.tsx
│   │           ├── components/
│   │           │   ├── stats.tsx
│   │           │   ├── viewport-overlay.tsx
│   │           │   └── item-inspector.tsx
│   │           ├── styles/
│   │           │   └── panel.css
│   │           └── utils/
│   │               ├── shadow-dom.ts
│   │               ├── draggable.ts
│   │               └── resizable.ts
│   │
│   ├── react/                      # React integration
│   │   ├── index.ts
│   │   ├── context.ts              # React context
│   │   ├── components/
│   │   │   ├── index.ts
│   │   │   ├── virtual-list.tsx
│   │   │   ├── virtual-grid.tsx
│   │   │   ├── virtual-masonry.tsx
│   │   │   └── debug-panel.tsx
│   │   └── hooks/
│   │       ├── index.ts
│   │       ├── use-virtual-list.ts
│   │       ├── use-virtual-grid.ts
│   │       ├── use-virtual-masonry.ts
│   │       ├── use-scrollex.ts
│   │       └── use-measure.ts
│   │
│   └── utils/                      # Internal utilities
│       ├── index.ts
│       ├── binary-search.ts
│       ├── throttle.ts
│       ├── debounce.ts
│       ├── raf.ts                  # requestAnimationFrame helpers
│       ├── scroll.ts               # Scroll utilities
│       ├── rect.ts                 # DOMRect helpers
│       └── array.ts                # Array utilities
│
├── tests/
│   ├── unit/
│   │   ├── kernel/
│   │   ├── plugins/
│   │   │   ├── core/
│   │   │   └── optional/
│   │   ├── react/
│   │   └── utils/
│   ├── integration/
│   │   ├── virtual-list.test.tsx
│   │   ├── virtual-grid.test.tsx
│   │   ├── virtual-masonry.test.tsx
│   │   ├── infinite-scroll.test.tsx
│   │   └── performance.test.ts
│   ├── e2e/
│   │   └── scroll-performance.test.ts
│   └── fixtures/
│       ├── test-data.ts
│       └── mock-components.tsx
│
├── examples/
│   ├── basic-list/
│   │   ├── index.html
│   │   └── src/
│   ├── variable-heights/
│   │   ├── index.html
│   │   └── src/
│   ├── infinite-scroll/
│   │   ├── index.html
│   │   └── src/
│   ├── chat-app/
│   │   ├── index.html
│   │   └── src/
│   ├── product-grid/
│   │   ├── index.html
│   │   └── src/
│   ├── masonry-gallery/
│   │   ├── index.html
│   │   └── src/
│   └── grouped-list/
│       ├── index.html
│       └── src/
│
├── website/                        # Documentation site
│   ├── index.html
│   ├── docs/
│   │   ├── index.html
│   │   ├── getting-started.html
│   │   ├── api/
│   │   │   ├── index.html
│   │   │   ├── virtual-list.html
│   │   │   ├── virtual-grid.html
│   │   │   ├── virtual-masonry.html
│   │   │   ├── hooks.html
│   │   │   └── plugins.html
│   │   ├── guides/
│   │   │   ├── index.html
│   │   │   ├── variable-heights.html
│   │   │   ├── infinite-scroll.html
│   │   │   ├── chat-apps.html
│   │   │   ├── sticky-headers.html
│   │   │   └── performance.html
│   │   ├── plugins/
│   │   │   ├── index.html
│   │   │   ├── core-plugins.html
│   │   │   ├── optional-plugins.html
│   │   │   └── custom-plugins.html
│   │   ├── examples/
│   │   │   ├── index.html
│   │   │   └── [example].html
│   │   └── playground/
│   │       └── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── images/
│   │       ├── og-image.png
│   │       └── favicon.svg
│   └── 404.html
│
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## DOCUMENTATION WEBSITE

Build documentation site for `https://scrollex.oxog.dev`

### Technology Stack
- **Tailwind CSS** (via CDN)
- **Alpine.js** (via CDN)
- **Prism.js** for syntax highlighting
- **Static HTML** (no build step)

### Design Theme (Dark)
```css
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--bg-tertiary: #1f1f1f;
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--accent: #8b5cf6;        /* Purple - scroll/motion theme */
--accent-hover: #7c3aed;
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
```

### Required Pages

1. **Landing Page** - Hero, features, quick install, live demo preview
2. **Getting Started** - Installation, basic setup, first virtual list
3. **API Reference** - Full documentation for all components/hooks
4. **Guides** - Variable heights, infinite scroll, chat apps, performance
5. **Core Plugins** - Documentation for 5 core plugins
6. **Optional Plugins** - Documentation for 7 optional plugins
7. **Examples** - Basic list, grid, masonry, chat, etc.
8. **Playground** - Interactive demo with live preview

### Special Features

- Live scrolling demos embedded
- Performance comparison charts
- Copy-to-clipboard on all code blocks
- npm/yarn/pnpm tabs
- Mobile responsive
- Interactive playground with different list types

---

## IMPLEMENTATION CHECKLIST

Before starting implementation:
- [ ] Create SPECIFICATION.md with complete package spec
- [ ] Create IMPLEMENTATION.md with architecture design
- [ ] Create TASKS.md with ordered task list

During implementation:
- [ ] Implement kernel first (scroll engine, viewport, range calculator)
- [ ] Implement core plugins (5)
- [ ] Implement React components and hooks
- [ ] Implement optional plugins (7)
- [ ] Build Debug Panel last
- [ ] Maintain 100% test coverage throughout
- [ ] Write JSDoc for all public APIs
- [ ] Create performance benchmarks

Before completion:
- [ ] All tests passing (100% success)
- [ ] Coverage report shows 100%
- [ ] Performance benchmarks pass (100k items, 60fps)
- [ ] README.md complete
- [ ] CHANGELOG.md initialized
- [ ] Website functional
- [ ] Package builds without errors
- [ ] Tree-shaking works correctly

---

## CRITICAL IMPLEMENTATION NOTES

### Performance is Everything
This is a virtualization library - performance is the #1 priority:
- Use binary search for range calculation (O(log n))
- Cache all measurements
- Throttle scroll handlers to 60fps
- Use requestAnimationFrame for DOM updates
- Batch DOM reads/writes to avoid layout thrashing
- Use CSS containment (`contain: strict`)
- Avoid creating objects in hot paths (object pooling)

### Scroll Smoothness
- Native scroll (no manual scroll handling)
- CSS `will-change: transform` on items
- Hardware acceleration with `transform: translateY()`
- Avoid `position: absolute` with `top` (use transform)

### Measurement Strategy
For variable heights:
1. Use estimated height initially
2. Measure after render with ResizeObserver
3. Update cached height
4. Adjust scroll position to prevent jumps
5. Re-render affected items

### React Integration
- Support React 17, 18, 19
- Handle StrictMode double-renders
- Use refs carefully (callback refs for measurements)
- Memoize renderItem callback
- Support forwardRef on components

### Edge Cases
- Empty list
- Single item
- Very tall items (> viewport)
- Very wide items (horizontal)
- Dynamic item addition/removal
- Container resize
- Window resize
- Fast scrolling (momentum)
- Scroll to unmeasured items

---

## BEGIN IMPLEMENTATION

Start by creating SPECIFICATION.md with the complete package specification. Then proceed with IMPLEMENTATION.md and TASKS.md before writing any actual code.

Remember: This package will be published to NPM. It must be production-ready, zero-dependency, fully tested, and professionally documented.

Performance is the key differentiator - the library must handle 100k+ items at 60fps. Invest heavily in optimization and benchmarking.