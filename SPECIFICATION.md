# Scrollex - Complete Package Specification

## Overview

**Package Name**: `@oxog/scrollex`
**Version**: 1.0.0
**Description**: Zero-dependency React virtualization library with micro-kernel plugin architecture.
**License**: MIT
**Author**: ersinkoc
**Repository**: https://github.com/ersinkoc/scrollex
**Documentation**: https://scrollex.oxog.dev

---

## Core Philosophy

### Zero Dependencies
The package MUST have zero runtime dependencies. All functionality is implemented from scratch:
- No lodash, no underscore
- No external event emitters
- No external scroll libraries
- No external resize observers polyfills
- React is a peer dependency only

### Performance First
Virtualization is ALL about performance. Every design decision prioritizes:
- O(log n) or O(1) operations where possible
- Minimal memory footprint
- 60fps scroll performance
- Sub-16ms frame budgets

### Plugin Architecture
The micro-kernel approach provides:
- Small core footprint
- Tree-shakeable plugins
- Easy extensibility
- Clean separation of concerns

---

## Package Structure

```
@oxog/scrollex
├── Main Entry (index.ts)
│   ├── VirtualList component
│   ├── VirtualGrid component
│   ├── VirtualMasonry component
│   ├── useVirtualList hook
│   ├── useVirtualGrid hook
│   ├── useVirtualMasonry hook
│   ├── useScrollex hook
│   ├── createPlugin utility
│   ├── getKernel utility
│   └── All type exports
│
└── Plugins Entry (plugins/index.ts)
    ├── masonryRenderer
    ├── stickyHeaders
    ├── keyboardNav
    ├── scrollRestoration
    ├── bidirectional
    ├── dragToReorder
    └── debugPanel + DebugPanel component
```

---

## API Specification

### Components

#### VirtualList<T>

```typescript
interface VirtualListProps<T> {
  // Required
  data: T[]
  renderItem: (props: RenderItemProps<T>) => React.ReactNode

  // Item sizing
  itemHeight: number | 'auto'
  estimatedItemHeight?: number  // Required when itemHeight='auto', default: 50

  // Container sizing
  height?: number | string      // Container height, default: '100%'
  width?: number | string       // Container width, default: '100%'

  // Scroll direction
  direction?: 'vertical' | 'horizontal'  // default: 'vertical'

  // Performance
  overscan?: number             // Extra items to render, default: 5

  // Initial state
  initialScrollOffset?: number  // default: 0

  // Item identification
  getItemKey?: (index: number, data: T[]) => string | number

  // Infinite scroll
  onLoadMore?: () => void | Promise<void>
  hasMore?: boolean             // default: false
  isLoading?: boolean           // default: false
  loadingIndicator?: React.ReactNode
  threshold?: number            // Pixels from edge, default: 200

  // Events
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  onVisibleRangeChange?: (range: Range) => void
  onItemsRendered?: (info: ItemsRenderedInfo) => void

  // Plugins
  plugins?: Plugin[]

  // Styling
  className?: string
  style?: React.CSSProperties
  innerClassName?: string       // Inner container class
  innerStyle?: React.CSSProperties
  itemClassName?: string        // Applied to each item wrapper
  itemStyle?: React.CSSProperties
}

interface RenderItemProps<T> {
  item: T
  index: number
  style: React.CSSProperties    // Position styles (MUST be applied)
  measureRef: React.RefCallback<HTMLElement>  // For auto measurement
  isVisible: boolean            // Is in visible range (not overscan)
  isScrolling: boolean          // Is list currently scrolling
}

interface Range {
  startIndex: number            // First visible item
  endIndex: number              // Last visible item
  overscanStartIndex: number    // First rendered item (with overscan)
  overscanEndIndex: number      // Last rendered item (with overscan)
}

interface ItemsRenderedInfo {
  overscanStartIndex: number
  overscanEndIndex: number
  visibleStartIndex: number
  visibleEndIndex: number
}
```

#### VirtualGrid<T>

```typescript
interface VirtualGridProps<T> {
  // Required
  data: T[]
  renderItem: (props: GridRenderItemProps<T>) => React.ReactNode
  itemHeight: number            // Row height (fixed)

  // Grid configuration
  columns: number | 'auto'      // Column count or auto-calculate
  minColumnWidth?: number       // For auto columns, default: 100
  gap?: number | { x: number; y: number }  // default: 0

  // Container sizing
  height?: number | string
  width?: number | string

  // Performance
  overscan?: number             // Extra rows to render, default: 2

  // ... same optional props as VirtualList
}

interface GridRenderItemProps<T> extends RenderItemProps<T> {
  columnIndex: number
  rowIndex: number
  columnWidth: number
}
```

#### VirtualMasonry<T>

```typescript
interface VirtualMasonryProps<T> {
  // Required
  data: T[]
  renderItem: (props: MasonryRenderItemProps<T>) => React.ReactNode
  getItemHeight: (item: T, columnWidth: number) => number

  // Grid configuration
  columns: number | 'auto'
  minColumnWidth?: number       // default: 200
  gap?: number                  // default: 0

  // Container sizing
  height?: number | string
  width?: number | string

  // Performance
  overscan?: number             // default: 5

  // ... same optional props as VirtualList
}

interface MasonryRenderItemProps<T> extends GridRenderItemProps<T> {
  width: number                 // Calculated column width
}
```

---

### Hooks

#### useVirtualList

```typescript
interface UseVirtualListOptions {
  count: number
  getItemHeight?: (index: number) => number
  estimatedItemHeight?: number  // default: 50
  overscan?: number             // default: 5
  paddingStart?: number         // default: 0
  paddingEnd?: number           // default: 0
  scrollMargin?: number         // default: 0
  initialOffset?: number        // default: 0
  getItemKey?: (index: number) => string | number
  horizontal?: boolean          // default: false

  // Container ref (required)
  containerRef: React.RefObject<HTMLElement>
}

interface UseVirtualListReturn {
  virtualItems: VirtualItem[]
  totalSize: number             // Total scroll height/width
  scrollOffset: number          // Current scroll position
  isScrolling: boolean

  // Methods
  scrollTo: (offset: number, options?: ScrollOptions) => void
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  measureElement: (element: HTMLElement | null) => void

  // Range info
  range: Range

  // Measurement cache
  getMeasurement: (index: number) => number | undefined
  invalidateMeasurement: (index: number) => void
  invalidateAllMeasurements: () => void
}

interface VirtualItem {
  index: number
  key: string | number
  start: number                 // Offset from start
  end: number                   // Offset + size
  size: number                  // Height (vertical) or width (horizontal)
  lane: number                  // Column index (for grid/masonry)
}
```

#### useVirtualGrid

```typescript
interface UseVirtualGridOptions extends Omit<UseVirtualListOptions, 'getItemHeight'> {
  columns: number
  rowHeight: number
  gap?: number | { x: number; y: number }
}

interface UseVirtualGridReturn extends UseVirtualListReturn {
  columnCount: number
  columnWidth: number
  rowCount: number
}
```

#### useVirtualMasonry

```typescript
interface UseVirtualMasonryOptions {
  count: number
  columns: number
  getItemHeight: (index: number, columnWidth: number) => number
  gap?: number
  containerRef: React.RefObject<HTMLElement>
  overscan?: number
}

interface UseVirtualMasonryReturn extends UseVirtualListReturn {
  columnCount: number
  columnWidth: number
  columnHeights: number[]
}
```

#### useScrollex

```typescript
function useScrollex(): Kernel | null
```

Returns the kernel instance from context, or null if not within a Scrollex provider.

---

### Kernel API

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

  // Measurement
  measureItem(index: number): number
  getCachedHeight(index: number): number | undefined
  invalidateMeasurement(index: number): void
  invalidateAllMeasurements(): void

  // Events
  emit(event: KernelEvent): void
  on(eventType: EventType, handler: EventHandler): () => void
  off(eventType: EventType, handler: EventHandler): void

  // Configuration
  configure(options: KernelOptions): void
  getOptions(): KernelOptions

  // State
  isScrolling(): boolean
  getItemCount(): number
  getTotalSize(): number
}
```

---

### Plugin System

#### Plugin Interface

```typescript
interface Plugin {
  // Identity (required)
  name: string
  version: string
  type: 'core' | 'optional'

  // Lifecycle (required)
  install(kernel: Kernel): void
  uninstall(): void

  // Hooks (optional)
  hooks?: {
    onScroll?: (event: ScrollEvent) => void
    onVisibleRangeChange?: (range: Range) => void
    onItemMeasured?: (index: number, height: number) => void
    onResize?: (viewport: Viewport) => void
    onLoadMore?: (direction: 'forward' | 'backward') => void
    onItemsChange?: (count: number) => void
  }

  // Public API (optional)
  api?: Record<string, unknown>
}

// Helper function
function createPlugin(config: PluginConfig): Plugin
```

#### Core Plugins (5)

1. **list-renderer** - Core virtualization engine
2. **grid-renderer** - Multi-column grid layout
3. **auto-measurer** - Dynamic height measurement
4. **infinite-loader** - Infinite scroll detection
5. **scroll-controller** - Programmatic scroll control

#### Optional Plugins (7)

1. **masonry-renderer** - Pinterest-style layout
2. **sticky-headers** - Sticky group headers
3. **keyboard-nav** - Keyboard navigation
4. **scroll-restoration** - Scroll position persistence
5. **bidirectional** - Chat-style bidirectional scroll
6. **drag-to-reorder** - Drag and drop reordering
7. **debug-panel** - Visual debugging tools

---

### Event System

```typescript
type EventType =
  | 'scroll'
  | 'visible-range-change'
  | 'item-measured'
  | 'resize'
  | 'load-more'
  | 'items-change'
  | 'scroll-start'
  | 'scroll-end'

interface ScrollEvent {
  type: 'scroll'
  scrollTop: number
  scrollLeft: number
  deltaY: number
  deltaX: number
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
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

interface ResizeEvent {
  type: 'resize'
  viewport: Viewport
  previousViewport: Viewport | null
}

interface LoadMoreEvent {
  type: 'load-more'
  direction: 'forward' | 'backward'
}

interface ItemsChangeEvent {
  type: 'items-change'
  count: number
  previousCount: number
}
```

---

## Performance Specifications

### Targets

| Metric | Target |
|--------|--------|
| Item Count | 100,000+ |
| Scroll FPS | 60 |
| Frame Budget | < 16ms |
| Initial Render | < 100ms |
| Memory (100k items) | < 50MB |

### Algorithms

1. **Binary Search** for visible range calculation - O(log n)
2. **Height Cache** with Map for O(1) lookups
3. **Throttled Scroll Handler** at 60fps (16.67ms)
4. **RAF-batched DOM Updates** to prevent layout thrashing
5. **Object Pooling** for VirtualItem reuse

### Memory Optimization

- Store only heights (4 bytes per item), not full objects
- Use WeakMap for element references
- Clear caches on unmount
- Limit history buffers
- Avoid closures in hot paths

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |

### Required APIs

- ResizeObserver
- requestAnimationFrame
- requestIdleCallback (with fallback)
- Map, Set, WeakMap
- CSS contain property
- CSS will-change property

---

## Build Output

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./plugins": {
      "import": "./dist/plugins/index.js",
      "require": "./dist/plugins/index.cjs",
      "types": "./dist/plugins/index.d.ts"
    }
  }
}
```

### Bundle Sizes (Target)

| Bundle | Size (gzip) |
|--------|-------------|
| Core (VirtualList only) | < 5KB |
| Full (all components) | < 10KB |
| All plugins | < 15KB |

---

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "skipLibCheck": true
  }
}
```

---

## Testing Requirements

### Coverage Target: 100%

- All statements covered
- All branches covered
- All functions covered
- All lines covered

### Test Categories

1. **Unit Tests** - Individual functions and classes
2. **Integration Tests** - Component interactions
3. **Performance Tests** - Benchmarks and profiling
4. **E2E Tests** - Full scroll scenarios

### Test Framework

- Vitest for unit/integration
- @testing-library/react for component tests
- jsdom for DOM simulation
- Custom scroll simulation utilities

---

## Documentation Requirements

### JSDoc

Every public API must have complete JSDoc:

```typescript
/**
 * Creates a virtualized list component that efficiently renders large datasets.
 *
 * @template T - The type of items in the data array
 * @param props - Component configuration
 * @returns A React element representing the virtualized list
 *
 * @example
 * <VirtualList
 *   data={items}
 *   itemHeight={50}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>{item.name}</div>
 *   )}
 * />
 *
 * @see {@link https://scrollex.oxog.dev/docs/api/virtual-list}
 */
```

### README.md

- Installation instructions
- Quick start example
- Feature overview
- Link to full documentation

### Website

- Landing page with hero demo
- Getting started guide
- Full API reference
- Plugin documentation
- Interactive playground
- Performance comparison

---

## Error Handling

### Error Messages

All errors must be descriptive and actionable:

```typescript
throw new Error(
  `[Scrollex] estimatedItemHeight is required when itemHeight="auto". ` +
  `Provide a number representing the average item height in pixels.`
)
```

### Development Warnings

Use console.warn for non-critical issues:

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '[Scrollex] renderItem is not memoized. ' +
    'This may cause performance issues. ' +
    'Consider wrapping it with React.useCallback().'
  )
}
```

---

## Accessibility

### ARIA Support

- `role="listbox"` or `role="grid"` on container
- `role="option"` or `role="gridcell"` on items
- `aria-rowcount` for total count
- `aria-rowindex` for item position
- `aria-selected` for selected items

### Keyboard Navigation (via plugin)

- Arrow keys for navigation
- Home/End for first/last
- PageUp/PageDown for page jumps
- Enter/Space for selection
- Type-ahead search

### Focus Management

- Maintain focus when scrolling
- Focus visible indicators
- Scroll focused item into view

---

## Security Considerations

### XSS Prevention

- No raw HTML injection
- Escape user-provided content
- CSP-compatible (no inline styles in shadow DOM)

### Safe Defaults

- No external resource loading
- No eval or Function constructor
- No localStorage access without explicit configuration

---

## Changelog Format

Follow Keep a Changelog format:

```markdown
## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- VirtualList component
- VirtualGrid component
- VirtualMasonry component
- 5 core plugins
- 7 optional plugins

### Fixed
- N/A

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Security
- N/A
```
