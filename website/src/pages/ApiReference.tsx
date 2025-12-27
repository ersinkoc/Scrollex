import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Code2, Box, Cpu, Puzzle, FileType } from 'lucide-react'

const sidebarItems = [
  { id: 'useVirtualList', label: 'useVirtualList', icon: Code2 },
  { id: 'VirtualList', label: 'VirtualList', icon: Box },
  { id: 'createKernel', label: 'createKernel', icon: Cpu },
  { id: 'plugin-api', label: 'Plugin API', icon: Puzzle },
  { id: 'types', label: 'Types', icon: FileType },
]

const CodeBlock = ({ code, language = 'tsx' }: { code: string; language?: string }) => (
  <div className="rounded-xl overflow-hidden border border-border/50 my-4">
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      showLineNumbers
      customStyle={{
        margin: 0,
        padding: '1rem',
        background: '#0d1117',
        fontSize: '0.875rem',
      }}
    >
      {code.trim()}
    </SyntaxHighlighter>
  </div>
)

export default function ApiReference() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex gap-8 max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
              API Reference
            </h3>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              API <span className="text-gradient">Reference</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Complete API documentation for all Scrollex exports.
            </p>
          </div>

          <section id="useVirtualList" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-violet-400" />
              </div>
              useVirtualList
            </h2>
            <p className="text-muted-foreground mb-4">The primary hook for creating virtualized lists.</p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Signature</h3>
            <CodeBlock code={`function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn`} />

            <h3 className="text-lg font-semibold mt-6 mb-3">Options</h3>
            <CodeBlock
              code={`interface UseVirtualListOptions {
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
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Returns</h3>
            <CodeBlock
              code={`interface UseVirtualListReturn {
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
}`}
            />
          </section>

          <section id="VirtualList" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Box className="w-4 h-4 text-emerald-400" />
              </div>
              VirtualList Component
            </h2>
            <p className="text-muted-foreground mb-4">A ready-to-use virtualized list component.</p>

            <CodeBlock
              code={`import { VirtualList } from '@oxog/scrollex'

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
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Props</h3>
            <CodeBlock
              code={`interface VirtualListProps<T> {
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
}`}
            />
          </section>

          <section id="createKernel" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              createKernel
            </h2>
            <p className="text-muted-foreground mb-4">Create a virtualization kernel for advanced use cases.</p>

            <CodeBlock
              code={`import { createKernel } from '@oxog/scrollex'

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
kernel.destroy()`}
            />
          </section>

          <section id="plugin-api" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Puzzle className="w-4 h-4 text-pink-400" />
              </div>
              Plugin API
            </h2>
            <p className="text-muted-foreground mb-4">Create custom plugins to extend Scrollex functionality.</p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Plugin Interface</h3>
            <CodeBlock
              code={`interface Plugin {
  name: string
  version?: string
  type?: 'renderer' | 'behavior' | 'utility'
  dependencies?: string[]
  api?: Record<string, unknown>  // Plugin API exposed to users
  install?: (kernel: Kernel) => void
  destroy?: () => void
  hooks?: PluginHooks
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Available Hooks</h3>
            <CodeBlock
              code={`interface PluginHooks {
  onScroll?: (event: ScrollEvent) => void
  onScrollStart?: (event: ScrollStartEvent) => void
  onScrollEnd?: (event: ScrollEndEvent) => void
  onVisibleRangeChange?: (event: VisibleRangeChangeEvent) => void
  onItemMeasured?: (event: ItemMeasuredEvent) => void
  onResize?: (event: ResizeEvent) => void
  onLoadMore?: (event: LoadMoreEvent) => void
  onItemsChange?: (event: ItemsChangeEvent) => void
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Creating a Plugin</h3>
            <CodeBlock
              code={`import { createPlugin } from '@oxog/scrollex'

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
})`}
            />
          </section>

          <section id="types" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FileType className="w-4 h-4 text-amber-400" />
              </div>
              Types
            </h2>

            <h3 className="text-lg font-semibold mt-6 mb-3">VirtualItem</h3>
            <CodeBlock
              code={`interface VirtualItem {
  index: number      // Index in the data array
  key: string | number  // Unique key for React
  start: number      // Top position in pixels
  size: number       // Height in pixels
  end: number        // Bottom position (start + size)
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Range</h3>
            <CodeBlock
              code={`interface Range {
  startIndex: number       // First visible item index
  endIndex: number         // Last visible item index
  overscanStartIndex: number  // First rendered item (with overscan)
  overscanEndIndex: number    // Last rendered item (with overscan)
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">ScrollEvent</h3>
            <CodeBlock
              code={`interface ScrollEvent {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
  direction: 'forward' | 'backward'
  velocity: number
}`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">ScrollOptions</h3>
            <CodeBlock
              code={`interface ScrollOptions {
  behavior?: 'auto' | 'smooth' | 'instant'
}

interface ScrollToIndexOptions extends ScrollOptions {
  align?: 'start' | 'center' | 'end' | 'auto'
}`}
            />
          </section>
        </main>
      </div>
    </div>
  )
}
