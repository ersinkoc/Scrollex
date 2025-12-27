# Scrollex

<div align="center">

**Zero-dependency React virtualization library with micro-kernel plugin architecture**

[![npm version](https://img.shields.io/npm/v/@oxog/scrollex.svg)](https://www.npmjs.com/package/@oxog/scrollex)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@oxog/scrollex)](https://bundlephobia.com/package/@oxog/scrollex)
[![license](https://img.shields.io/npm/l/@oxog/scrollex.svg)](https://github.com/ersinkoc/Scrollex/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

[Documentation](https://scrollex.oxog.dev) | [Examples](https://scrollex.oxog.dev/examples) | [GitHub](https://github.com/ersinkoc/Scrollex)

</div>

---

## Features

- **Zero Dependencies** - No runtime dependencies, React is a peer dependency
- **High Performance** - 100k+ items at 60fps with RAF-based rendering
- **Micro-Kernel Architecture** - Small core (~3KB) with tree-shakeable plugins
- **Variable Heights** - Auto-measurement for dynamic content
- **Infinite Scroll** - Built-in bidirectional infinite loading
- **Multiple Layouts** - List, Grid, and Masonry components
- **TypeScript First** - Full type safety with strict mode
- **Accessible** - Keyboard navigation and ARIA support

## Installation

```bash
npm install @oxog/scrollex
```

```bash
yarn add @oxog/scrollex
```

```bash
pnpm add @oxog/scrollex
```

## Quick Start

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

## Components

### VirtualList

Efficiently render large lists with fixed or variable heights.

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

**Variable Heights:**

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

### VirtualGrid

Multi-column grid virtualization.

```tsx
import { VirtualGrid } from '@oxog/scrollex'

<VirtualGrid
  data={products}
  columns={4}
  itemHeight={200}
  gap={16}
  height={600}
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
      <img src={item.url} width={width} alt={item.alt} />
    </div>
  )}
/>
```

## Hooks

For more control, use the hooks directly:

```tsx
import { useRef } from 'react'
import { useVirtualList } from '@oxog/scrollex'

function MyList({ items }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize, scrollToIndex } = useVirtualList({
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

## Plugins

Extend functionality with optional plugins:

```tsx
import { VirtualList } from '@oxog/scrollex'
import { infiniteLoaderPlugin, debugPanelPlugin } from '@oxog/scrollex/plugins'

<VirtualList
  data={items}
  itemHeight={50}
  plugins={[
    infiniteLoaderPlugin({
      threshold: 200,
      onLoadMore: async (direction) => {
        const newItems = await fetchMore(direction)
        setItems(prev => [...prev, ...newItems])
      }
    }),
    debugPanelPlugin({ position: 'bottom-right' }),
  ]}
  renderItem={({ item, style }) => (
    <div style={style}>{item.name}</div>
  )}
/>
```

### Available Plugins

| Plugin | Description |
|--------|-------------|
| `listRendererPlugin` | Core list rendering |
| `gridRendererPlugin` | Grid layout rendering |
| `autoMeasurerPlugin` | Automatic height measurement |
| `infiniteLoaderPlugin` | Infinite scroll loading |
| `scrollControllerPlugin` | Programmatic scroll control |
| `debugPanelPlugin` | Visual debugging tools |

## Infinite Scroll

```tsx
import { useState } from 'react'
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

## Performance

Scrollex is designed for maximum performance:

- **Binary Search** - O(log n) visible range calculation
- **Measurement Caching** - Efficient variable height handling
- **RAF Batching** - Smooth 60fps rendering
- **CSS Containment** - Optimized paint and layout
- **Tree Shaking** - Import only what you need

Tested with **100,000+ items** at consistent 60fps.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Documentation

Full documentation available at **[scrollex.oxog.dev](https://scrollex.oxog.dev)**

- [Getting Started](https://scrollex.oxog.dev/getting-started)
- [API Reference](https://scrollex.oxog.dev/api)
- [Examples](https://scrollex.oxog.dev/examples)
- [Plugins](https://scrollex.oxog.dev/plugins)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone the repository
git clone https://github.com/ersinkoc/Scrollex.git

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
```

## Author

**Ersin KOC** - [@ersinkoc](https://github.com/ersinkoc)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with care by Ersin KOC</sub>
</div>
