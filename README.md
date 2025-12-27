# Scrollex

Zero-dependency React virtualization library with micro-kernel plugin architecture.

[![npm version](https://img.shields.io/npm/v/@oxog/scrollex.svg)](https://www.npmjs.com/package/@oxog/scrollex)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@oxog/scrollex)](https://bundlephobia.com/package/@oxog/scrollex)
[![license](https://img.shields.io/npm/l/@oxog/scrollex.svg)](https://github.com/ersinkoc/scrollex/blob/main/LICENSE)

## Features

- **Zero Dependencies** - No runtime dependencies, React is a peer dependency
- **High Performance** - 100k+ items at 60fps
- **Micro-Kernel Architecture** - Small core with tree-shakeable plugins
- **Variable Heights** - Auto-measurement for dynamic content
- **Infinite Scroll** - Built-in infinite loading support
- **Multiple Layouts** - List, Grid, and Masonry components
- **TypeScript First** - Full type safety with strict mode
- **Accessibility** - Keyboard navigation and ARIA support

## Installation

```bash
npm install @oxog/scrollex
```

## Quick Start

```tsx
import { VirtualList } from '@oxog/scrollex'

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
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

## Components

### VirtualList

Efficiently render large lists with fixed or variable heights.

```tsx
<VirtualList
  data={items}
  itemHeight={50}
  // or itemHeight="auto" for variable heights
  estimatedItemHeight={60}
  renderItem={({ item, style, measureRef }) => (
    <div ref={measureRef} style={style}>
      {item.content}
    </div>
  )}
/>
```

### VirtualGrid

Multi-column grid virtualization.

```tsx
<VirtualGrid
  data={products}
  columns={4}
  itemHeight={200}
  gap={16}
  renderItem={({ item, style }) => (
    <div style={style}>
      <ProductCard product={item} />
    </div>
  )}
/>
```

### VirtualMasonry

Pinterest-style masonry layout.

```tsx
<VirtualMasonry
  data={images}
  columns={3}
  gap={8}
  getItemHeight={(item, columnWidth) => (item.height / item.width) * columnWidth}
  renderItem={({ item, style, width }) => (
    <div style={style}>
      <img src={item.url} width={width} />
    </div>
  )}
/>
```

## Hooks

For more control, use the hooks directly:

```tsx
import { useVirtualList } from '@oxog/scrollex'

function MyList({ items }) {
  const containerRef = useRef(null)

  const { virtualItems, totalSize, scrollToIndex } = useVirtualList({
    count: items.length,
    estimatedItemHeight: 50,
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

## Plugins

Extend functionality with optional plugins:

```tsx
import { VirtualList } from '@oxog/scrollex'
import { stickyHeaders, keyboardNav, debugPanel } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  itemHeight={50}
  plugins={[
    stickyHeaders({ headerHeight: 40 }),
    keyboardNav({ loop: true }),
    debugPanel(),
  ]}
  renderItem={({ item, style }) => (
    <div style={style}>{item.name}</div>
  )}
/>
```

### Available Plugins

| Plugin | Description |
|--------|-------------|
| `masonryRenderer` | Pinterest-style masonry layout |
| `stickyHeaders` | Sticky group headers |
| `keyboardNav` | Keyboard navigation |
| `scrollRestoration` | Scroll position persistence |
| `bidirectional` | Chat-style bidirectional scroll |
| `dragToReorder` | Drag and drop reordering |
| `debugPanel` | Visual debugging tools |

## Infinite Scroll

```tsx
<VirtualList
  data={items}
  itemHeight={50}
  onLoadMore={async () => {
    const newItems = await fetchMoreItems()
    setItems([...items, ...newItems])
  }}
  hasMore={hasNextPage}
  isLoading={isLoading}
  loadingIndicator={<Spinner />}
  renderItem={({ item, style }) => (
    <div style={style}>{item.name}</div>
  )}
/>
```

## Performance

Scrollex is designed for maximum performance:

- Binary search for O(log n) visible range calculation
- Measurement caching for variable heights
- Object pooling to minimize garbage collection
- RAF-batched DOM updates
- CSS containment for rendering optimization

Tested with 100,000+ items at 60fps.

## Documentation

Full documentation available at [scrollex.oxog.dev](https://scrollex.oxog.dev)

## License

MIT
