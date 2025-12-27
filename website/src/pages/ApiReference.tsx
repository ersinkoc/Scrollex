import styles from './Docs.module.css'

export default function ApiReference() {
  return (
    <div className={styles.docs}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav>
            <h3>API Reference</h3>
            <ul>
              <li><a href="#useVirtualList">useVirtualList</a></li>
              <li><a href="#VirtualList">VirtualList Component</a></li>
              <li><a href="#createKernel">createKernel</a></li>
              <li><a href="#plugin-api">Plugin API</a></li>
              <li><a href="#types">Types</a></li>
            </ul>
          </nav>
        </aside>

        <main className={styles.content}>
          <h1>API Reference</h1>

          <section id="useVirtualList">
            <h2>useVirtualList</h2>
            <p>The primary hook for creating virtualized lists.</p>

            <h3>Signature</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn`}</code></pre>
            </div>

            <h3>Options</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface UseVirtualListOptions {
  count: number                    // Total number of items
  containerRef: RefObject<HTMLDivElement>  // Ref to scroll container
  estimatedItemHeight?: number     // Estimated item height (default: 50)
  getItemHeight?: (index: number) => number  // Known item heights
  overscan?: number                // Extra items to render (default: 5)
  paddingStart?: number            // Padding at start (default: 0)
  paddingEnd?: number              // Padding at end (default: 0)
  initialOffset?: number           // Initial scroll offset (default: 0)
  getItemKey?: (index: number) => string | number  // Key generator
  horizontal?: boolean             // Horizontal mode (default: false)
}`}</code></pre>
            </div>

            <h3>Returns</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface UseVirtualListReturn {
  virtualItems: VirtualItem[]      // Visible virtual items
  totalSize: number                // Total content height
  scrollOffset: number             // Current scroll position
  isScrolling: boolean             // Whether currently scrolling
  scrollTo: (offset: number, options?: ScrollOptions) => void
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void
  measureElement: (index: number, element: HTMLElement | null) => void
  range: Range                     // Visible range info
  getMeasurement: (index: number) => number | undefined
  invalidateMeasurement: (index: number) => void
  invalidateAllMeasurements: () => void
}`}</code></pre>
            </div>
          </section>

          <section id="VirtualList">
            <h2>VirtualList Component</h2>
            <p>A ready-to-use virtualized list component.</p>

            <div className={styles.codeBlock}>
              <pre><code>{`import { VirtualList } from '@oxog/scrollex'

function MyList({ data }) {
  return (
    <VirtualList
      data={data}
      height={400}
      itemHeight={50}
      renderItem={({ item, index, style }) => (
        <div style={style}>
          {item.name}
        </div>
      )}
    />
  )
}`}</code></pre>
            </div>

            <h3>Props</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface VirtualListProps<T> {
  data: T[]                        // Array of items
  height: number | string          // Container height
  width?: number | string          // Container width
  itemHeight: number | ((index: number, item: T) => number)
  renderItem: (props: RenderItemProps<T>) => ReactNode
  overscan?: number
  className?: string
  style?: CSSProperties
  onItemsRendered?: (info: ItemsRenderedInfo) => void
  onScroll?: (scrollTop: number) => void
}`}</code></pre>
            </div>
          </section>

          <section id="createKernel">
            <h2>createKernel</h2>
            <p>Create a virtualization kernel for advanced use cases.</p>

            <div className={styles.codeBlock}>
              <pre><code>{`import { createKernel } from '@oxog/scrollex'

const kernel = createKernel({
  itemCount: 1000,
  estimatedItemHeight: 50,
  overscan: 5,
})

// Attach to a container element
kernel.attach(containerElement)

// Subscribe to events
kernel.on('scroll', (event) => {
  console.log('Scroll:', event.scrollTop)
})

kernel.on('visible-range-change', (event) => {
  console.log('Range:', event.range)
})

// Scroll methods
kernel.scrollTo(500)
kernel.scrollToIndex(100, { align: 'center' })

// Cleanup
kernel.destroy()`}</code></pre>
            </div>
          </section>

          <section id="plugin-api">
            <h2>Plugin API</h2>
            <p>Create custom plugins to extend Scrollex functionality.</p>

            <h3>Plugin Interface</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface Plugin {
  name: string
  version?: string
  type?: 'renderer' | 'behavior' | 'utility'
  dependencies?: string[]
  api?: Record<string, unknown>  // Plugin API exposed to users
  install?: (kernel: Kernel) => void
  destroy?: () => void
  hooks?: PluginHooks
}`}</code></pre>
            </div>

            <h3>Available Hooks</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface PluginHooks {
  onScroll?: (event: ScrollEvent) => void
  onScrollStart?: (event: ScrollStartEvent) => void
  onScrollEnd?: (event: ScrollEndEvent) => void
  onVisibleRangeChange?: (event: VisibleRangeChangeEvent) => void
  onItemMeasured?: (event: ItemMeasuredEvent) => void
  onResize?: (event: ResizeEvent) => void
  onLoadMore?: (event: LoadMoreEvent) => void
  onItemsChange?: (event: ItemsChangeEvent) => void
}`}</code></pre>
            </div>

            <h3>Creating a Plugin</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`import { createPlugin } from '@oxog/scrollex'

const analyticsPlugin = createPlugin({
  name: 'analytics',
  version: '1.0.0',
  type: 'utility',

  install(kernel) {
    console.log('Analytics plugin installed')
  },

  destroy() {
    console.log('Analytics plugin destroyed')
  },

  hooks: {
    onScroll(event) {
      trackScrollDepth(event.scrollTop / event.scrollHeight)
    },
    onVisibleRangeChange(event) {
      trackVisibleItems(event.range.startIndex, event.range.endIndex)
    }
  }
})`}</code></pre>
            </div>
          </section>

          <section id="types">
            <h2>Types</h2>

            <h3>VirtualItem</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface VirtualItem {
  index: number      // Index in the data array
  key: string | number  // Unique key for React
  start: number      // Top position in pixels
  size: number       // Height in pixels
  end: number        // Bottom position (start + size)
}`}</code></pre>
            </div>

            <h3>Range</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface Range {
  startIndex: number       // First visible item index
  endIndex: number         // Last visible item index
  overscanStartIndex: number  // First rendered item (with overscan)
  overscanEndIndex: number    // Last rendered item (with overscan)
}`}</code></pre>
            </div>

            <h3>ScrollEvent</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface ScrollEvent {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
  direction: 'forward' | 'backward'
  velocity: number
}`}</code></pre>
            </div>

            <h3>ScrollOptions</h3>
            <div className={styles.codeBlock}>
              <pre><code>{`interface ScrollOptions {
  behavior?: 'auto' | 'smooth' | 'instant'
}

interface ScrollToIndexOptions extends ScrollOptions {
  align?: 'start' | 'center' | 'end' | 'auto'
}`}</code></pre>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
