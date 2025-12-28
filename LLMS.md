# @oxog/scrollex - LLM Documentation

> Zero-dependency React virtualization library with micro-kernel plugin architecture

**Version:** 1.0.0
**License:** MIT
**Repository:** https://github.com/ersinkoc/Scrollex
**Homepage:** https://scrollex.oxog.dev
**Author:** Ersin KOC

---

## Quick Reference

### Installation

```bash
npm install @oxog/scrollex
# or
yarn add @oxog/scrollex
# or
pnpm add @oxog/scrollex
```

### Quick Start

```tsx
import { VirtualList } from '@oxog/scrollex'

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`,
  }))

  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={400}
      renderItem={({ item, style }) => (
        <div style={style}>{item.name}</div>
      )}
    />
  )
}
```

---

## Package Overview

### Purpose

Scrollex is a high-performance React virtualization library designed to efficiently render large datasets (100,000+ items) at 60fps. It uses a micro-kernel architecture with a plugin system, allowing developers to include only the features they need while maintaining a minimal core bundle size (~3KB).

### Key Features

- **Zero Dependencies** - No runtime dependencies; React is a peer dependency
- **High Performance** - 100k+ items at 60fps with RAF-based rendering
- **Micro-Kernel Architecture** - Small core with tree-shakeable plugins
- **Variable Heights** - Auto-measurement for dynamic content using ResizeObserver
- **Infinite Scroll** - Built-in bidirectional infinite loading
- **Multiple Layouts** - List, Grid, and Masonry components
- **TypeScript First** - Full type safety with strict mode
- **Accessible** - Keyboard navigation and ARIA support

### Architecture

The library is built around a micro-kernel that handles:
- Event-driven communication via typed event bus
- Plugin registry with dependency resolution
- Binary search for O(log n) visible range calculation
- RAF-throttled scroll handling for smooth 60fps rendering
- Configurable viewport management
- Measurement caching for variable heights

Data flows from the kernel through plugins to React components:
```
User Scroll → ScrollEngine → EventBus → Plugins → RangeCalculator → VirtualItems → React Render
```

### Dependencies

- **Runtime:** Zero runtime dependencies
- **Peer:** `react >=17.0.0`, `react-dom >=17.0.0`

---

## API Reference

### Exports Summary

| Export | Type | Description |
|--------|------|-------------|
| `VirtualList` | Component | Virtualized list with fixed/variable heights |
| `VirtualGrid` | Component | Multi-column grid virtualization |
| `VirtualMasonry` | Component | Pinterest-style masonry layout |
| `useVirtualList` | Hook | Hook for custom list virtualization |
| `useVirtualGrid` | Hook | Hook for custom grid virtualization |
| `useVirtualMasonry` | Hook | Hook for custom masonry layouts |
| `useMeasure` | Hook | Measure element dimensions |
| `useMeasureMany` | Hook | Batch element measurement |
| `useScrollex` | Hook | Access kernel from context |
| `useScrollexRequired` | Hook | Access kernel (throws if missing) |
| `createKernel` | Function | Create a kernel instance |
| `createPlugin` | Function | Helper to create plugins |
| `easings` | Object | Built-in easing functions |

### Components

#### `VirtualList<T>`

Efficiently renders large lists with fixed or variable heights.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `T[]` | Yes | - | Array of items to render |
| `renderItem` | `(props: RenderItemProps<T>) => ReactNode` | Yes | - | Function to render each item |
| `itemHeight` | `number \| 'auto'` | Yes | - | Fixed height or 'auto' for dynamic |
| `estimatedItemHeight` | `number` | No | `50` | Estimated height for auto measurement |
| `height` | `number \| string` | No | `'100%'` | Container height |
| `width` | `number \| string` | No | `'100%'` | Container width |
| `direction` | `'vertical' \| 'horizontal'` | No | `'vertical'` | Scroll direction |
| `overscan` | `number` | No | `5` | Extra items to render outside viewport |
| `initialScrollOffset` | `number` | No | `0` | Initial scroll position |
| `getItemKey` | `(index: number, data: T[]) => string \| number` | No | - | Custom key generator |
| `onLoadMore` | `() => void \| Promise<void>` | No | - | Infinite scroll callback |
| `hasMore` | `boolean` | No | `false` | Whether more items exist |
| `isLoading` | `boolean` | No | `false` | Loading state |
| `loadingIndicator` | `ReactNode` | No | - | Loading UI element |
| `threshold` | `number` | No | `200` | Pixels from edge to trigger load |
| `onScroll` | `(scrollTop: number, scrollLeft: number) => void` | No | - | Scroll callback |
| `onVisibleRangeChange` | `(range: Range) => void` | No | - | Range change callback |
| `onItemsRendered` | `(info: ItemsRenderedInfo) => void` | No | - | Items rendered callback |
| `plugins` | `Plugin[]` | No | `[]` | Array of plugins |
| `className` | `string` | No | - | Outer container class |
| `style` | `CSSProperties` | No | - | Outer container style |
| `innerClassName` | `string` | No | - | Inner container class |
| `innerStyle` | `CSSProperties` | No | - | Inner container style |
| `itemClassName` | `string` | No | - | Item wrapper class |
| `itemStyle` | `CSSProperties` | No | - | Item wrapper style |
| `role` | `string` | No | `'listbox'` | ARIA role |
| `ariaLabel` | `string` | No | - | ARIA label |
| `tabIndex` | `number` | No | - | Tab index |

**Ref Handle (VirtualListHandle):**

```typescript
interface VirtualListHandle {
  scrollTo(offset: number, options?: ScrollOptions): void
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void
  scrollToTop(options?: ScrollOptions): void
  scrollToBottom(options?: ScrollOptions): void
  getScrollPosition(): ScrollPosition
}
```

**Example - Fixed Heights:**

```tsx
import { VirtualList } from '@oxog/scrollex'

<VirtualList
  data={items}
  itemHeight={50}
  height={400}
  overscan={5}
  renderItem={({ item, index, style }) => (
    <div style={style}>
      {item.name}
    </div>
  )}
/>
```

**Example - Variable Heights:**

```tsx
<VirtualList
  data={items}
  itemHeight="auto"
  estimatedItemHeight={60}
  renderItem={({ item, style, measureRef }) => (
    <div ref={measureRef} style={style}>
      {item.content}
    </div>
  )}
/>
```

**Example - With Ref:**

```tsx
import { useRef } from 'react'
import { VirtualList, VirtualListHandle } from '@oxog/scrollex'

function MyList() {
  const listRef = useRef<VirtualListHandle>(null)

  const scrollToItem = (index: number) => {
    listRef.current?.scrollToIndex(index, {
      align: 'center',
      behavior: 'smooth'
    })
  }

  return (
    <>
      <button onClick={() => scrollToItem(500)}>Go to item 500</button>
      <VirtualList
        ref={listRef}
        data={items}
        itemHeight={50}
        renderItem={({ item, style }) => (
          <div style={style}>{item.name}</div>
        )}
      />
    </>
  )
}
```

---

#### `VirtualGrid<T>`

Multi-column grid virtualization with gap support.

**Props (extends VirtualListProps):**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `number \| 'auto'` | Yes | - | Number of columns |
| `minColumnWidth` | `number` | No | `100` | Min width for auto columns |
| `gap` | `number \| GridGap` | No | `0` | Gap between items |
| `itemHeight` | `number` | Yes | - | Fixed row height |
| `renderItem` | `(props: GridRenderItemProps<T>) => ReactNode` | Yes | - | Grid item renderer |

**GridRenderItemProps (extends RenderItemProps):**

```typescript
interface GridRenderItemProps<T> extends RenderItemProps<T> {
  columnIndex: number  // 0-based column index
  rowIndex: number     // 0-based row index
  columnWidth: number  // Calculated column width
}
```

**Example:**

```tsx
import { VirtualGrid } from '@oxog/scrollex'

<VirtualGrid
  data={products}
  columns={4}
  itemHeight={200}
  gap={16}
  height={600}
  renderItem={({ item, style, columnWidth }) => (
    <div style={style}>
      <ProductCard product={item} width={columnWidth} />
    </div>
  )}
/>
```

**Example - Responsive Columns:**

```tsx
<VirtualGrid
  data={products}
  columns="auto"
  minColumnWidth={200}
  itemHeight={250}
  gap={{ x: 16, y: 24 }}
  renderItem={({ item, style, columnIndex, rowIndex }) => (
    <div style={style}>
      <ProductCard
        product={item}
        position={`${rowIndex}-${columnIndex}`}
      />
    </div>
  )}
/>
```

---

#### `VirtualMasonry<T>`

Pinterest-style masonry layout with dynamic item heights.

**Props (extends VirtualGridProps):**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `getItemHeight` | `(item: T, columnWidth: number) => number` | Yes | - | Calculate item height |
| `renderItem` | `(props: MasonryRenderItemProps<T>) => ReactNode` | Yes | - | Masonry item renderer |

**MasonryRenderItemProps (extends GridRenderItemProps):**

```typescript
interface MasonryRenderItemProps<T> extends GridRenderItemProps<T> {
  width: number  // Calculated item width (same as columnWidth)
}
```

**Example:**

```tsx
import { VirtualMasonry } from '@oxog/scrollex'

<VirtualMasonry
  data={images}
  columns={3}
  gap={8}
  height={800}
  getItemHeight={(item, columnWidth) =>
    (item.height / item.width) * columnWidth
  }
  renderItem={({ item, style, width }) => (
    <div style={style}>
      <img
        src={item.url}
        width={width}
        alt={item.alt}
        loading="lazy"
      />
    </div>
  )}
/>
```

---

### Hooks

#### `useVirtualList(options)`

Low-level hook for building custom virtualized lists.

**Options:**

```typescript
interface UseVirtualListOptions {
  count: number                              // Total number of items
  containerRef: RefObject<HTMLElement>       // Container element ref
  getItemHeight?: (index: number) => number  // Get item height
  estimatedItemHeight?: number               // Default: 50
  overscan?: number                          // Default: 5
  paddingStart?: number                      // Default: 0
  paddingEnd?: number                        // Default: 0
  scrollMargin?: number                      // Scroll margin
  initialOffset?: number                     // Default: 0
  getItemKey?: (index: number) => string | number
  horizontal?: boolean                       // Default: false
}
```

**Returns:**

```typescript
interface UseVirtualListReturn {
  virtualItems: VirtualItem[]
  totalSize: number
  scrollOffset: number
  isScrolling: boolean
  scrollTo: (offset: number, options?: ScrollOptions) => void
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  measureElement: (index: number, element: HTMLElement | null) => void
  range: Range
  getMeasurement: (index: number) => number | undefined
  invalidateMeasurement: (index: number) => void
  invalidateAllMeasurements: () => void
}
```

**Example:**

```tsx
import { useRef } from 'react'
import { useVirtualList } from '@oxog/scrollex'

function MyList({ items }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    virtualItems,
    totalSize,
    scrollToIndex,
    isScrolling,
  } = useVirtualList({
    count: items.length,
    estimatedItemHeight: 50,
    containerRef,
    overscan: 5,
  })

  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalSize, position: 'relative' }}>
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
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### `useVirtualGrid(options)`

Hook for building custom virtualized grids.

**Options (extends UseVirtualListOptions):**

```typescript
interface UseVirtualGridOptions extends Omit<UseVirtualListOptions, 'getItemHeight'> {
  columns: number
  rowHeight: number
  gap?: number | GridGap
}
```

**Returns (extends UseVirtualListReturn):**

```typescript
interface UseVirtualGridReturn extends UseVirtualListReturn {
  columnCount: number
  columnWidth: number
  rowCount: number
}
```

**Example:**

```tsx
import { useRef } from 'react'
import { useVirtualGrid } from '@oxog/scrollex'

function MyGrid({ items }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    virtualItems,
    totalSize,
    columnCount,
    columnWidth,
  } = useVirtualGrid({
    count: items.length,
    columns: 4,
    rowHeight: 200,
    gap: 16,
    containerRef,
  })

  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              left: virtualItem.lane * (columnWidth + 16),
              width: columnWidth,
              height: virtualItem.size,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### `useVirtualMasonry(options)`

Hook for building custom masonry layouts.

**Options:**

```typescript
interface UseVirtualMasonryOptions {
  count: number
  columns: number
  getItemHeight: (index: number, columnWidth: number) => number
  gap?: number
  containerRef: RefObject<HTMLElement>
  overscan?: number
}
```

**Returns (extends UseVirtualListReturn):**

```typescript
interface UseVirtualMasonryReturn extends UseVirtualListReturn {
  columnCount: number
  columnWidth: number
  columnHeights: number[]  // Height of each column
}
```

---

#### `useMeasure(options?)`

Hook for measuring element dimensions with ResizeObserver.

**Options:**

```typescript
interface UseMeasureOptions {
  onResize?: (width: number, height: number) => void
  debounce?: number  // Debounce delay in ms
}
```

**Returns:**

```typescript
interface UseMeasureReturn {
  measureRef: RefCallback<HTMLElement>
  width: number
  height: number
}
```

**Example:**

```tsx
import { useMeasure } from '@oxog/scrollex'

function MyComponent() {
  const { measureRef, width, height } = useMeasure({
    onResize: (w, h) => console.log('Resized:', w, h)
  })

  return (
    <div ref={measureRef}>
      Size: {width} x {height}
    </div>
  )
}
```

---

#### `useMeasureMany()`

Hook for measuring multiple elements efficiently.

**Returns:**

```typescript
{
  createMeasureRef: (key: string | number) => RefCallback<HTMLElement>
  getMeasurement: (key: string | number) => { width: number; height: number } | undefined
  onMeasure: (callback: (key: string | number, width: number, height: number) => void) => void
  clear: () => void
}
```

---

#### `useScrollex()`

Access the kernel from Scrollex context. Returns `null` if not within a provider.

```tsx
function MyComponent() {
  const kernel = useScrollex()

  const handleClick = () => {
    kernel?.scrollToIndex(10, { align: 'center', behavior: 'smooth' })
  }

  return <button onClick={handleClick}>Scroll to item 10</button>
}
```

---

#### `useScrollexRequired()`

Access the kernel from context. Throws if not within a Scrollex component.

```tsx
function MyComponent() {
  const kernel = useScrollexRequired()
  // kernel is guaranteed to be defined
  kernel.scrollToIndex(10)
}
```

---

### Types & Interfaces

#### `VirtualItem`

```typescript
interface VirtualItem {
  index: number           // Index in data array
  key: string | number    // Unique key for React
  start: number           // Offset from scroll start (px)
  end: number             // End position (start + size)
  size: number            // Item size (height/width)
  lane: number            // Column index for grid/masonry
}
```

#### `Range`

```typescript
interface Range {
  startIndex: number          // First visible item index
  endIndex: number            // Last visible item index
  overscanStartIndex: number  // First rendered (with overscan)
  overscanEndIndex: number    // Last rendered (with overscan)
}
```

#### `ScrollPosition`

```typescript
interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
  offset?: number       // Normalized offset
  percentage?: number   // Scroll percentage (0-1)
}
```

#### `ScrollOptions`

```typescript
interface ScrollOptions {
  behavior?: 'auto' | 'smooth'
  duration?: number          // For smooth scroll (ms)
  easing?: EasingFunction    // Easing function
}
```

#### `ScrollToIndexOptions`

```typescript
interface ScrollToIndexOptions extends ScrollOptions {
  align?: 'start' | 'center' | 'end' | 'auto'
  offset?: number  // Additional offset (px)
}
```

#### `RenderItemProps<T>`

```typescript
interface RenderItemProps<T> {
  item: T                           // Item data
  index: number                     // Item index
  style: CSSProperties              // Position styles
  measureRef: RefCallback<HTMLElement>  // For dynamic heights
  isVisible: boolean                // In visible range
  isScrolling: boolean              // Currently scrolling
}
```

#### `GridGap`

```typescript
interface GridGap {
  x: number  // Horizontal gap
  y: number  // Vertical gap
}
```

---

### Kernel API

The kernel is the core virtualization engine. Access via `useScrollex()` or create directly.

#### `createKernel(options)`

```typescript
function createKernel(options: Partial<KernelOptions>): Kernel

interface KernelOptions {
  itemCount: number
  estimatedItemHeight: number
  overscan: number
  direction: 'vertical' | 'horizontal'
  getItemKey?: (index: number) => string | number
}
```

#### `Kernel` Interface

```typescript
interface Kernel {
  // Plugin Management
  register(plugin: Plugin): void
  unregister(pluginName: string): void
  getPlugin<T extends Plugin>(name: string): T | undefined
  listPlugins(): PluginInfo[]

  // Scroll Control
  getScrollPosition(): ScrollPosition
  setScrollPosition(position: ScrollPosition): void
  scrollTo(offset: number, options?: ScrollOptions): void
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void

  // Viewport
  getViewport(): Viewport
  getVisibleRange(): Range
  getRenderRange(): Range

  // Measurement
  measureItem(index: number, size: number): void
  getCachedHeight(index: number): number | undefined
  invalidateMeasurement(index: number): void
  invalidateAllMeasurements(): void
  getEstimatedHeight(): number
  getItemOffset(index: number): number

  // Events
  emit(event: KernelEvent): void
  on<T extends KernelEvent>(eventType: T['type'], handler: EventHandler<T>): Unsubscribe
  off<T extends KernelEvent>(eventType: T['type'], handler: EventHandler<T>): void

  // Configuration
  configure(options: Partial<KernelOptions>): void
  getOptions(): KernelOptions

  // State
  isScrolling(): boolean
  getItemCount(): number
  getTotalSize(): number

  // Lifecycle
  attach(container: HTMLElement): void
  detach(): void
  destroy(): void
}
```

---

### Event Types

```typescript
type EventType =
  | 'scroll'
  | 'scroll-start'
  | 'scroll-end'
  | 'visible-range-change'
  | 'item-measured'
  | 'resize'
  | 'load-more'
  | 'items-change'

interface ScrollEvent {
  type: 'scroll'
  scrollTop: number
  scrollLeft: number
  deltaY: number
  deltaX: number
  direction: ScrollDirection
  timestamp: number
}

interface ScrollStartEvent {
  type: 'scroll-start'
  scrollTop: number
  scrollLeft: number
  timestamp: number
}

interface ScrollEndEvent {
  type: 'scroll-end'
  scrollTop: number
  scrollLeft: number
  timestamp: number
}

interface VisibleRangeChangeEvent {
  type: 'visible-range-change'
  range: Range
  previousRange: Range | null
}

interface ItemMeasuredEvent {
  type: 'item-measured'
  index: number
  height: number
  previousHeight: number | undefined
}

interface LoadMoreEvent {
  type: 'load-more'
  direction: 'forward' | 'backward'
}
```

---

### Easing Functions

```typescript
import { easings } from '@oxog/scrollex'

easings.linear        // (t) => t
easings.easeIn        // (t) => t * t
easings.easeOut       // (t) => t * (2 - t)
easings.easeInOut     // Quadratic ease in-out
easings.easeInCubic   // Cubic ease in
easings.easeOutCubic  // Cubic ease out
easings.easeInOutCubic // Cubic ease in-out
easings.easeInQuart   // Quartic ease in
easings.easeOutQuart  // Quartic ease out
easings.easeInOutQuart // Quartic ease in-out
```

---

## Plugins

Plugins extend core functionality. Import from `@oxog/scrollex/plugins`.

### Core Plugins

These are used internally by components but can be used directly with hooks.

#### `listRendererPlugin`

Core list rendering with positioning calculations.

```typescript
import { listRendererPlugin } from '@oxog/scrollex/plugins'

interface ListRendererOptions {
  getItemKey?: (index: number) => string | number
}

interface ListRendererAPI {
  getVirtualItems(): VirtualItem[]
  getItemAtOffset(offset: number): VirtualItem | null
  getItemsInRange(start: number, end: number): VirtualItem[]
}
```

#### `gridRendererPlugin`

Grid layout calculations and rendering.

```typescript
interface GridRendererOptions {
  columns: number | 'auto'
  rowHeight: number
  gap?: GridGap
  getItemKey?: (index: number) => string | number
}

interface GridRendererAPI {
  getVirtualItems(): VirtualItem[]
  getColumnCount(): number
  getColumnWidth(): number
  getRowCount(): number
  getTotalHeight(): number
  recalculate(): void
}
```

#### `autoMeasurerPlugin`

Automatic height measurement with ResizeObserver.

```typescript
interface AutoMeasurerOptions {
  estimatedHeight?: number
  measureOnMount?: boolean
}

interface AutoMeasurerAPI {
  measure(index: number, element: HTMLElement): void
  getMeasurement(index: number): number | undefined
  invalidate(index: number): void
  invalidateAll(): void
}
```

#### `infiniteLoaderPlugin`

Bidirectional infinite scroll with debouncing.

```typescript
import { infiniteLoaderPlugin } from '@oxog/scrollex/plugins'

interface InfiniteLoaderOptions {
  threshold?: number           // Pixels from edge (default: 200)
  thresholdItems?: number      // Items from edge (default: 5)
  direction?: 'forward' | 'backward' | 'both'
  onLoadMore: (direction: LoadDirection) => void | Promise<void>
}

interface InfiniteLoaderAPI {
  isLoading(): boolean
  setLoading(loading: boolean): void
  hasMore(): boolean
  setHasMore(hasMore: boolean): void
  hasMoreForward(): boolean
  setHasMoreForward(hasMore: boolean): void
  hasMoreBackward(): boolean
  setHasMoreBackward(hasMore: boolean): void
  reset(): void
  triggerLoad(direction: LoadDirection): void
}
```

**Example:**

```tsx
import { VirtualList } from '@oxog/scrollex'
import { infiniteLoaderPlugin } from '@oxog/scrollex/plugins'

function InfiniteList() {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)

  const handleLoadMore = async (direction: 'forward' | 'backward') => {
    if (loading) return
    setLoading(true)

    const newItems = await fetchMoreItems(direction)
    setItems(prev =>
      direction === 'forward'
        ? [...prev, ...newItems]
        : [...newItems, ...prev]
    )

    setLoading(false)
  }

  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={400}
      plugins={[
        infiniteLoaderPlugin({
          threshold: 200,
          onLoadMore: handleLoadMore,
        })
      ]}
      renderItem={({ item, style }) => (
        <div style={style}>{item.name}</div>
      )}
    />
  )
}
```

#### `scrollControllerPlugin`

Programmatic scroll control with smooth animations.

```typescript
interface ScrollControllerOptions {
  defaultDuration?: number      // Default: 300ms
  defaultEasing?: EasingFunction
}

interface ScrollControllerAPI {
  scrollTo(offset: number, options?: ScrollOptions): void
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void
  scrollToTop(options?: ScrollOptions): void
  scrollToBottom(options?: ScrollOptions): void
  getScrollPosition(): ScrollPosition
  isScrolling(): boolean
  isAnimating(): boolean
  stopAnimation(): void
}
```

---

### Optional Plugins

#### `debugPanel`

Visual debugging panel with performance monitoring.

```typescript
import { debugPanel, DebugPanelOverlay } from '@oxog/scrollex/plugins'

interface DebugPanelOptions {
  enabled?: boolean              // Default: true
  collapsed?: boolean            // Default: false
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  theme?: 'light' | 'dark' | 'auto'
  showFps?: boolean              // Default: true
  showViewportOverlay?: boolean  // Default: false
  showItemBoundaries?: boolean   // Default: false
  logEvents?: boolean            // Default: false
  maxEventLogEntries?: number    // Default: 100
  statsUpdateInterval?: number   // Default: 100ms
}

interface DebugPanelAPI {
  toggle(): void
  show(): void
  hide(): void
  isVisible(): boolean
  setCollapsed(collapsed: boolean): void
  isCollapsed(): boolean
  getStats(): PerformanceStats
  getEventLog(): EventLogEntry[]
  clearEventLog(): void
  setActiveTab(tab: 'stats' | 'events' | 'settings'): void
  getActiveTab(): DebugPanelTab
  toggleViewportOverlay(): void
  toggleItemBoundaries(): void
  exportData(): string
}
```

**Example:**

```tsx
import { VirtualList } from '@oxog/scrollex'
import { debugPanel } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  itemHeight={50}
  plugins={[
    debugPanel({ position: 'bottom-right' })
  ]}
  renderItem={...}
/>
```

---

#### `stickyHeaders`

Enables sticky group headers that remain visible while scrolling.

```typescript
import { stickyHeaders } from '@oxog/scrollex/plugins'

interface StickyHeadersOptions {
  headerHeight: number | ((groupId: string) => number)
  isHeader: (index: number) => boolean
  getGroupId: (index: number) => string
  zIndex?: number        // Default: 10
  stickyOffset?: number  // Default: 0
}

interface StickyHeadersAPI {
  getCurrentStickyHeader(): number | null
  getGroupForIndex(index: number): string
  scrollToGroup(groupId: string): void
  getHeaderIndices(): number[]
  getGroupIds(): string[]
  isHeader(index: number): boolean
}
```

**Example:**

```tsx
const groupedItems = [
  { type: 'header', groupId: 'A', title: 'Group A' },
  { type: 'item', groupId: 'A', name: 'Item 1' },
  { type: 'item', groupId: 'A', name: 'Item 2' },
  { type: 'header', groupId: 'B', title: 'Group B' },
  { type: 'item', groupId: 'B', name: 'Item 3' },
]

<VirtualList
  data={groupedItems}
  plugins={[
    stickyHeaders({
      headerHeight: 40,
      isHeader: (index) => groupedItems[index].type === 'header',
      getGroupId: (index) => groupedItems[index].groupId,
    })
  ]}
  renderItem={({ item, style }) => (
    item.type === 'header'
      ? <Header style={style}>{item.title}</Header>
      : <Row style={style}>{item.name}</Row>
  )}
/>
```

---

#### `keyboardNav`

Accessible keyboard navigation for virtualized lists.

```typescript
import { keyboardNav } from '@oxog/scrollex/plugins'

interface KeyboardNavOptions {
  enabled?: boolean              // Default: true
  loop?: boolean                 // Default: false
  orientation?: 'vertical' | 'horizontal' | 'grid'
  pageSize?: number              // Default: 10
  columns?: number               // For grid orientation
  typeahead?: boolean            // Default: false
  typeaheadTimeout?: number      // Default: 1000ms
  getItemText?: (index: number) => string
  onFocus?: (index: number) => void
  onSelect?: (index: number) => void
  onKeyDown?: (event: KeyboardEvent, focusedIndex: number | null) => boolean | void
}

interface KeyboardNavAPI {
  getFocusedIndex(): number | null
  setFocusedIndex(index: number | null): void
  focusNext(): void
  focusPrevious(): void
  focusFirst(): void
  focusLast(): void
  selectFocused(): void
  enable(): void
  disable(): void
  isEnabled(): boolean
  clearTypeahead(): void
}
```

**Keyboard Shortcuts:**
- `ArrowUp/Down` - Navigate vertically
- `ArrowLeft/Right` - Navigate horizontally (horizontal/grid)
- `Home` - Focus first item
- `End` - Focus last item
- `PageUp/PageDown` - Jump by page size
- `Enter/Space` - Select focused item
- Type characters for type-ahead search

**Example:**

```tsx
<VirtualList
  data={items}
  plugins={[
    keyboardNav({
      loop: true,
      orientation: 'vertical',
      typeahead: true,
      getItemText: (index) => items[index].name,
      onSelect: (index) => handleSelect(items[index]),
    })
  ]}
  renderItem={...}
/>
```

---

#### `scrollRestoration`

Saves and restores scroll position across sessions.

```typescript
import { scrollRestoration } from '@oxog/scrollex/plugins'

interface ScrollRestorationOptions {
  key: string                    // Unique storage key
  storage?: 'sessionStorage' | 'localStorage' | ScrollRestorationStorage
  restoreOnMount?: boolean       // Default: true
  saveOnUnmount?: boolean        // Default: true
  saveOnScroll?: boolean         // Default: false
  debounceMs?: number            // Default: 500
  includeIndex?: boolean         // Save focused index
  maxAge?: number                // Expiry in ms, 0 = no expiry
}

interface ScrollRestorationAPI {
  save(): void
  restore(): boolean
  clear(): void
  getSavedPosition(): SavedScrollState | null
  hasSavedPosition(): boolean
}
```

**Example:**

```tsx
<VirtualList
  data={items}
  plugins={[
    scrollRestoration({
      key: 'my-list',
      storage: 'sessionStorage',
      restoreOnMount: true,
      saveOnUnmount: true,
    })
  ]}
  renderItem={...}
/>
```

---

#### `bidirectional`

Bidirectional (prepend and append) loading support.

```typescript
import { bidirectional } from '@oxog/scrollex/plugins'

interface BidirectionalOptions {
  onLoadForward?: () => Promise<void>
  onLoadBackward?: () => Promise<void>
  threshold?: number
}

interface BidirectionalAPI {
  loadForward(): Promise<void>
  loadBackward(): Promise<void>
  setLoading(direction: 'forward' | 'backward', loading: boolean): void
  isLoadingForward(): boolean
  isLoadingBackward(): boolean
}
```

---

#### `dragToReorder`

Drag and drop reordering of list items.

```typescript
import { dragToReorder } from '@oxog/scrollex/plugins'

interface DragToReorderOptions {
  enabled?: boolean
  axis?: 'x' | 'y' | 'both'
  onReorder?: (fromIndex: number, toIndex: number) => void
  onDragStart?: (index: number) => void
  onDragEnd?: (index: number) => void
  dropIndicatorStyle?: DropIndicatorStyle
}

interface DragToReorderAPI {
  getDraggedIndex(): number | null
  getDropIndex(): number | null
  isDragging(): boolean
  enable(): void
  disable(): void
}
```

---

## Usage Patterns

### Pattern 1: Simple Fixed-Height List

**Use Case:** Rendering uniform lists like chat messages, log entries, or simple data tables.

```tsx
import { VirtualList } from '@oxog/scrollex'

function ChatMessages({ messages }) {
  return (
    <VirtualList
      data={messages}
      itemHeight={60}
      height={500}
      renderItem={({ item, style }) => (
        <div style={style} className="message">
          <strong>{item.sender}:</strong> {item.text}
        </div>
      )}
    />
  )
}
```

### Pattern 2: Variable Height Content

**Use Case:** Lists where items have different heights (comments, tweets, cards).

```tsx
import { VirtualList } from '@oxog/scrollex'

function Comments({ comments }) {
  return (
    <VirtualList
      data={comments}
      itemHeight="auto"
      estimatedItemHeight={100}
      height={600}
      renderItem={({ item, style, measureRef }) => (
        <div ref={measureRef} style={style} className="comment">
          <div className="author">{item.author}</div>
          <div className="content">{item.content}</div>
          {item.replies.length > 0 && (
            <div className="replies">{item.replies.length} replies</div>
          )}
        </div>
      )}
    />
  )
}
```

### Pattern 3: Infinite Scroll with Loading State

**Use Case:** Paginated data loading as user scrolls.

```tsx
import { useState, useCallback } from 'react'
import { VirtualList } from '@oxog/scrollex'

function InfiniteList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    const response = await fetch(`/api/items?page=${page}`)
    const data = await response.json()

    setItems(prev => [...prev, ...data.items])
    setHasMore(data.hasMore)
    setPage(prev => prev + 1)
    setLoading(false)
  }, [loading, hasMore, page])

  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={400}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={loading}
      threshold={200}
      loadingIndicator={<div className="loading">Loading...</div>}
      renderItem={({ item, style }) => (
        <div style={style}>{item.name}</div>
      )}
    />
  )
}
```

### Pattern 4: Product Grid

**Use Case:** E-commerce product listings, image galleries.

```tsx
import { VirtualGrid } from '@oxog/scrollex'

function ProductGrid({ products }) {
  return (
    <VirtualGrid
      data={products}
      columns={4}
      itemHeight={300}
      gap={16}
      height="100vh"
      renderItem={({ item, style, columnWidth }) => (
        <div style={style} className="product-card">
          <img
            src={item.image}
            width={columnWidth}
            height={200}
            alt={item.name}
          />
          <h3>{item.name}</h3>
          <p>${item.price}</p>
        </div>
      )}
    />
  )
}
```

### Pattern 5: Image Masonry Gallery

**Use Case:** Pinterest-style image galleries with varying aspect ratios.

```tsx
import { VirtualMasonry } from '@oxog/scrollex'

function ImageGallery({ images }) {
  return (
    <VirtualMasonry
      data={images}
      columns={4}
      gap={8}
      height="100vh"
      getItemHeight={(item, columnWidth) =>
        (item.height / item.width) * columnWidth
      }
      renderItem={({ item, style, width }) => (
        <div style={style} className="gallery-item">
          <img
            src={item.url}
            width={width}
            alt={item.title}
            loading="lazy"
          />
          <div className="overlay">{item.title}</div>
        </div>
      )}
    />
  )
}
```

### Pattern 6: Grouped List with Sticky Headers

**Use Case:** Contact lists, alphabetical listings, categorized content.

```tsx
import { VirtualList } from '@oxog/scrollex'
import { stickyHeaders } from '@oxog/scrollex/plugins'

function ContactList({ contacts }) {
  // Prepare grouped data with headers
  const items = useMemo(() => {
    const grouped = groupBy(contacts, c => c.name[0].toUpperCase())
    const result = []

    for (const [letter, group] of Object.entries(grouped)) {
      result.push({ type: 'header', letter })
      group.forEach(contact => result.push({ type: 'contact', ...contact }))
    }

    return result
  }, [contacts])

  return (
    <VirtualList
      data={items}
      itemHeight={(index) => items[index].type === 'header' ? 40 : 60}
      height={500}
      plugins={[
        stickyHeaders({
          headerHeight: 40,
          isHeader: (index) => items[index].type === 'header',
          getGroupId: (index) => items[index].letter || items[index].name[0],
        })
      ]}
      renderItem={({ item, style }) => (
        item.type === 'header'
          ? <div style={style} className="header">{item.letter}</div>
          : <div style={style} className="contact">{item.name}</div>
      )}
    />
  )
}
```

### Pattern 7: Accessible List with Keyboard Navigation

**Use Case:** Dropdown menus, selectable lists, autocomplete.

```tsx
import { useState } from 'react'
import { VirtualList } from '@oxog/scrollex'
import { keyboardNav } from '@oxog/scrollex/plugins'

function SelectableList({ options, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <VirtualList
      data={options}
      itemHeight={40}
      height={300}
      tabIndex={0}
      role="listbox"
      ariaLabel="Select an option"
      plugins={[
        keyboardNav({
          loop: true,
          typeahead: true,
          getItemText: (index) => options[index].label,
          onFocus: (index) => setSelectedIndex(index),
          onSelect: (index) => onSelect(options[index]),
        })
      ]}
      renderItem={({ item, index, style }) => (
        <div
          style={style}
          role="option"
          aria-selected={index === selectedIndex}
          className={index === selectedIndex ? 'selected' : ''}
        >
          {item.label}
        </div>
      )}
    />
  )
}
```

---

## Integration Examples

### With React Query

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { VirtualList } from '@oxog/scrollex'

function InfiniteQueryList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => fetchItems(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  const items = data?.pages.flatMap(page => page.items) ?? []

  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={400}
      onLoadMore={() => fetchNextPage()}
      hasMore={hasNextPage}
      isLoading={isFetchingNextPage}
      renderItem={({ item, style }) => (
        <div style={style}>{item.name}</div>
      )}
    />
  )
}
```

### With Redux

```tsx
import { useSelector, useDispatch } from 'react-redux'
import { VirtualList } from '@oxog/scrollex'
import { loadMore, selectItems } from './itemsSlice'

function ReduxList() {
  const dispatch = useDispatch()
  const { items, loading, hasMore } = useSelector(selectItems)

  return (
    <VirtualList
      data={items}
      itemHeight={50}
      height={400}
      onLoadMore={() => dispatch(loadMore())}
      hasMore={hasMore}
      isLoading={loading}
      renderItem={({ item, style }) => (
        <div style={style}>{item.name}</div>
      )}
    />
  )
}
```

### With Next.js App Router

```tsx
// app/products/page.tsx
'use client'

import { VirtualGrid } from '@oxog/scrollex'
import { useProducts } from './useProducts'

export default function ProductsPage() {
  const { products, loadMore, hasMore, isLoading } = useProducts()

  return (
    <main className="h-screen">
      <VirtualGrid
        data={products}
        columns={4}
        itemHeight={300}
        gap={16}
        height="100%"
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        renderItem={({ item, style }) => (
          <div style={style}>
            <ProductCard product={item} />
          </div>
        )}
      />
    </main>
  )
}
```

### With Tailwind CSS

```tsx
import { VirtualList } from '@oxog/scrollex'

function TailwindList({ items }) {
  return (
    <VirtualList
      data={items}
      itemHeight={64}
      height={500}
      className="bg-gray-50 rounded-lg shadow-inner"
      innerClassName="p-2"
      renderItem={({ item, style }) => (
        <div
          style={style}
          className="bg-white rounded-md shadow-sm p-4 mx-2 mb-2
                     hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-gray-600 text-sm">{item.description}</p>
        </div>
      )}
    />
  )
}
```

---

## Error Reference

### Common Issues & Solutions

#### Issue: Items not rendering

**Symptoms:**
- Empty list despite having data
- Container shows but no items visible

**Cause:** Container height is 0 or not set.

**Solution:**
```tsx
// Ensure container has explicit height
<VirtualList
  data={items}
  itemHeight={50}
  height={400}  // Must be a number or valid CSS value
  // ...
/>
```

#### Issue: Items jumping or flickering

**Symptoms:**
- Items shift position during scroll
- Visible flickering

**Cause:** `estimatedItemHeight` is very different from actual heights.

**Solution:**
```tsx
// Provide accurate estimate
<VirtualList
  data={items}
  itemHeight="auto"
  estimatedItemHeight={80}  // Close to average actual height
  // ...
/>
```

#### Issue: measureRef not working

**Symptoms:**
- Variable heights not measured
- All items same height

**Cause:** `measureRef` not attached to DOM element.

**Solution:**
```tsx
renderItem={({ item, style, measureRef }) => (
  // measureRef MUST be on the element that determines height
  <div ref={measureRef} style={style}>
    {item.content}
  </div>
)}
```

#### Issue: Infinite scroll not triggering

**Symptoms:**
- `onLoadMore` never called
- Scrolling to bottom does nothing

**Cause:** Missing `hasMore` prop or `threshold` too small.

**Solution:**
```tsx
<VirtualList
  data={items}
  onLoadMore={loadMore}
  hasMore={true}        // Must be true to trigger
  threshold={200}       // Pixels from bottom
  isLoading={loading}   // Prevents duplicate calls
  // ...
/>
```

---

## Performance Considerations

### Bundle Size

- **Core package:** ~8KB minified
- **Gzipped:** ~3KB
- **Tree-shakeable:** Yes - only import what you use

### Optimization Tips

1. **Use fixed heights when possible**
   ```tsx
   // Faster - no measurement needed
   <VirtualList itemHeight={50} ... />

   // Slower - requires ResizeObserver
   <VirtualList itemHeight="auto" ... />
   ```

2. **Memoize expensive render functions**
   ```tsx
   const renderItem = useCallback(({ item, style }) => (
     <div style={style}>
       <ExpensiveComponent data={item} />
     </div>
   ), [])
   ```

3. **Use appropriate overscan**
   ```tsx
   // Lower for static content
   <VirtualList overscan={2} ... />

   // Higher for fast scrolling
   <VirtualList overscan={10} ... />
   ```

4. **Provide stable keys**
   ```tsx
   <VirtualList
     getItemKey={(index, data) => data[index].id}  // Stable ID
     // NOT: getItemKey={(index) => index}  // Unstable
   />
   ```

### Performance Benchmarks

| Scenario | Items | FPS | Render Time |
|----------|-------|-----|-------------|
| Fixed height list | 100,000 | 60 | <1ms |
| Variable height list | 100,000 | 60 | 2-5ms |
| 4-column grid | 100,000 | 60 | <1ms |
| Masonry layout | 10,000 | 60 | 3-8ms |

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |

Required APIs:
- ResizeObserver
- requestAnimationFrame
- CSS `contain` property

---

## TypeScript Support

### Type Imports

```typescript
import type {
  // Core types
  VirtualItem,
  Range,
  ScrollPosition,
  Viewport,
  ScrollDirection,
  ScrollBehavior,
  ScrollAlignment,

  // Event types
  KernelEvent,
  ScrollEvent,
  ScrollStartEvent,
  ScrollEndEvent,
  VisibleRangeChangeEvent,

  // Options types
  ScrollOptions,
  ScrollToIndexOptions,
  EasingFunction,

  // Plugin types
  Plugin,
  PluginType,
  PluginHooks,
  PluginInfo,

  // Kernel types
  Kernel,
  KernelOptions,

  // Component props
  VirtualListProps,
  VirtualGridProps,
  VirtualMasonryProps,
  RenderItemProps,
  GridRenderItemProps,
  MasonryRenderItemProps,
  VirtualListHandle,

  // Hook types
  UseVirtualListOptions,
  UseVirtualListReturn,
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  UseVirtualMasonryOptions,
  UseVirtualMasonryReturn,
} from '@oxog/scrollex'
```

### Generic Components

```tsx
interface Product {
  id: string
  name: string
  price: number
}

// Type-safe list
<VirtualList<Product>
  data={products}
  renderItem={({ item }) => (
    // item is typed as Product
    <div>{item.name}: ${item.price}</div>
  )}
/>
```

---

## Creating Custom Plugins

```typescript
import { createPlugin, Kernel, Plugin } from '@oxog/scrollex'

interface MyPluginOptions {
  myOption: string
}

interface MyPluginAPI {
  doSomething(): void
}

function myPlugin(options: MyPluginOptions): Plugin {
  let kernel: Kernel | null = null

  const api: MyPluginAPI = {
    doSomething() {
      if (kernel) {
        kernel.scrollToIndex(0)
      }
    }
  }

  return {
    name: 'my-plugin',
    version: '1.0.0',
    type: 'optional',

    install(k: Kernel) {
      kernel = k
      console.log('Plugin installed with:', options.myOption)
    },

    uninstall() {
      kernel = null
    },

    hooks: {
      onScroll: (event) => {
        console.log('Scrolled to:', event.scrollTop)
      },
      onVisibleRangeChange: (range) => {
        console.log('Visible range:', range.startIndex, '-', range.endIndex)
      }
    },

    api
  }
}

// Usage
<VirtualList
  plugins={[myPlugin({ myOption: 'value' })]}
  // ...
/>
```

---

## FAQ

### Q: How do I scroll to a specific item programmatically?

**A:** Use a ref to access the component handle:

```tsx
const listRef = useRef<VirtualListHandle>(null)

// Scroll to index
listRef.current?.scrollToIndex(100, {
  align: 'center',
  behavior: 'smooth'
})

return <VirtualList ref={listRef} ... />
```

### Q: How do I handle dynamic data updates?

**A:** Simply update the `data` prop - the component handles updates automatically:

```tsx
const [items, setItems] = useState(initialItems)

// Add items
setItems(prev => [...prev, newItem])

// Remove items
setItems(prev => prev.filter(item => item.id !== idToRemove))

// Update items
setItems(prev => prev.map(item =>
  item.id === id ? { ...item, ...updates } : item
))
```

### Q: Can I use this with React Native?

**A:** No, Scrollex is designed for web browsers only. It relies on DOM APIs like ResizeObserver and CSS containment.

### Q: How do I implement selection?

**A:** Use state alongside the keyboard navigation plugin:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

<VirtualList
  plugins={[
    keyboardNav({
      onSelect: (index) => {
        const id = items[index].id
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })
      }
    })
  ]}
  renderItem={({ item, style }) => (
    <div
      style={style}
      className={selectedIds.has(item.id) ? 'selected' : ''}
    >
      {item.name}
    </div>
  )}
/>
```

### Q: How do I handle horizontal scrolling?

**A:** Set the `direction` prop:

```tsx
<VirtualList
  data={items}
  itemHeight={200}  // This becomes width in horizontal mode
  height={200}      // Container height
  direction="horizontal"
  renderItem={({ item, style }) => (
    <div style={style}>{item.name}</div>
  )}
/>
```

---

## Glossary

| Term | Definition |
|------|------------|
| Virtual Item | A representation of an item with calculated position |
| Overscan | Extra items rendered outside viewport for smooth scrolling |
| Visible Range | Indices of items currently in the viewport |
| Render Range | Indices of items being rendered (includes overscan) |
| Kernel | Core virtualization engine managing state and plugins |
| Plugin | Modular extension that adds functionality to the kernel |
| Measurement Cache | Storage for measured item heights |
| RAF | requestAnimationFrame - browser API for smooth animations |

---

## Changelog (Recent)

### v1.0.0 (2025-12-27)

**Core Components:**
- `VirtualList` - High-performance virtualized list
- `VirtualGrid` - Multi-column grid virtualization
- `VirtualMasonry` - Pinterest-style masonry layout

**React Hooks:**
- `useVirtualList`, `useVirtualGrid`, `useVirtualMasonry`
- `useMeasure`, `useMeasureMany`
- `useScrollex`, `useScrollexRequired`

**Plugins:**
- Core: `listRendererPlugin`, `gridRendererPlugin`, `autoMeasurerPlugin`, `infiniteLoaderPlugin`, `scrollControllerPlugin`
- Optional: `debugPanel`, `stickyHeaders`, `keyboardNav`, `scrollRestoration`, `bidirectional`, `dragToReorder`

**Features:**
- Zero runtime dependencies
- Tree-shakeable exports (~3KB core)
- Full TypeScript support
- 71%+ test coverage

---

## Links

- **NPM:** https://www.npmjs.com/package/@oxog/scrollex
- **GitHub:** https://github.com/ersinkoc/Scrollex
- **Documentation:** https://scrollex.oxog.dev
- **Issues:** https://github.com/ersinkoc/Scrollex/issues

---

## LLM Usage Notes

### Recommended Prompts

When helping users with this package:

1. "Help me implement a virtualized list with @oxog/scrollex"
2. "How do I add infinite scrolling to my Scrollex list?"
3. "Debug this Scrollex error: [error message]"
4. "How do I handle variable height items in Scrollex?"
5. "Migrate my react-window list to Scrollex"

### Common Misconceptions

1. **Misconception:** "I need to manage scroll position manually"
   **Reality:** The component handles scroll management. Use refs and `scrollToIndex` for programmatic control.

2. **Misconception:** "Variable heights are slow"
   **Reality:** With proper `estimatedItemHeight` and ResizeObserver, variable heights perform well.

3. **Misconception:** "I need to wrap items in position:absolute divs"
   **Reality:** The `style` prop in `renderItem` includes all positioning - just spread it on your element.

### Code Generation Guidelines

When generating code for this package:

- Always import types separately with `import type`
- Use the component props interface for type safety
- Include `measureRef` on the outermost element for variable heights
- Always provide a stable `getItemKey` function when data has IDs
- Use `useCallback` for `renderItem` to prevent unnecessary re-renders
- Prefer `VirtualList` over hooks unless custom rendering is needed

---

## Document Metadata

- **Generated:** 2025-12-28
- **Package Version:** 1.0.0
- **Documentation Version:** 1.0
- **Format:** LLM-Optimized Markdown
