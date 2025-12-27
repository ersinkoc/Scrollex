import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Infinity,
  Layers,
  Ruler,
  RotateCcw,
  ArrowLeftRight,
  Bug,
  Puzzle,
  Wrench,
} from 'lucide-react'
import { cn } from '../lib/utils'

const CodeBlock = ({ code, language = 'tsx' }: { code: string; language?: string }) => (
  <div className="rounded-xl overflow-hidden border border-border/50 my-4">
    <SyntaxHighlighter
      language={language}
      style={oneDark}
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

const corePlugins = [
  {
    name: 'Infinite Loader',
    icon: Infinity,
    gradient: 'from-violet-500 to-purple-500',
    description: 'Automatically load more content when scrolling near the edge of the list.',
    code: `import { infiniteLoaderPlugin } from '@oxog/scrollex/plugins'

const plugin = infiniteLoaderPlugin({
  threshold: 200,
  onLoadMore: async (direction) => {
    const newItems = await fetchMoreItems(direction)
    setItems(prev => [...prev, ...newItems])
  }
})`,
  },
  {
    name: 'Sticky Headers',
    icon: Layers,
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Keep group headers visible while scrolling through grouped content.',
    code: `import { stickyHeadersPlugin } from '@oxog/scrollex/plugins'

const plugin = stickyHeadersPlugin({
  getGroupKey: (item) => item.category,
  renderHeader: (groupKey) => (
    <div className="sticky-header">{groupKey}</div>
  )
})`,
  },
  {
    name: 'Dynamic Heights',
    icon: Ruler,
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Support variable item heights with automatic measurement.',
    code: `import { dynamicHeightsPlugin } from '@oxog/scrollex/plugins'

const plugin = dynamicHeightsPlugin({
  estimatedHeight: 100,
  measureOnRender: true
})`,
  },
]

const optionalPlugins = [
  {
    name: 'Scroll Restoration',
    icon: RotateCcw,
    gradient: 'from-amber-500 to-orange-500',
    description: 'Remember and restore scroll position across navigation.',
    code: `import { scrollRestorationPlugin } from '@oxog/scrollex/plugins'

const plugin = scrollRestorationPlugin({
  key: 'my-list',
  storage: sessionStorage
})`,
  },
  {
    name: 'Bidirectional',
    icon: ArrowLeftRight,
    gradient: 'from-pink-500 to-rose-500',
    description: 'Enable horizontal scrolling with full virtualization support.',
    code: `import { bidirectionalPlugin } from '@oxog/scrollex/plugins'

const plugin = bidirectionalPlugin({
  direction: 'horizontal',
  itemWidth: 200
})`,
  },
  {
    name: 'Debug Panel',
    icon: Bug,
    gradient: 'from-indigo-500 to-violet-500',
    description: 'Development tool for monitoring virtualization performance.',
    code: `import { debugPanelPlugin } from '@oxog/scrollex/plugins'

const plugin = debugPanelPlugin({
  position: 'bottom-right',
  showFPS: true,
  showMemory: true
})`,
  },
]

const hooks = [
  { hook: 'onScroll', args: 'ScrollEvent', desc: 'Called on every scroll frame (RAF throttled)' },
  { hook: 'onScrollStart', args: '-', desc: 'Called when scrolling begins' },
  { hook: 'onScrollEnd', args: '-', desc: 'Called when scrolling stops (debounced)' },
  { hook: 'onVisibleRangeChange', args: 'VisibleRange', desc: 'Called when visible items change' },
  { hook: 'onItemMeasured', args: 'index, size', desc: 'Called when an item is measured' },
  { hook: 'onResize', args: 'Size', desc: 'Called when container is resized' },
  { hook: 'onLoadMore', args: 'direction', desc: 'Called when more items should load' },
  { hook: 'onItemsChange', args: 'items[]', desc: 'Called when items array changes' },
]

export default function Plugins() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex gap-8 max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
              Plugins
            </h3>
            <nav className="space-y-1">
              <a href="#overview" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Puzzle className="w-4 h-4" /> Overview
              </a>
              <a href="#core-plugins" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Puzzle className="w-4 h-4" /> Core Plugins
              </a>
              <a href="#optional-plugins" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Puzzle className="w-4 h-4" /> Optional Plugins
              </a>
              <a href="#custom-plugins" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <Wrench className="w-4 h-4" /> Custom Plugins
              </a>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-gradient">Plugins</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Extend Scrollex with our composable plugin system.
            </p>
          </div>

          <section id="overview" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-muted-foreground mb-4">
              Scrollex uses a micro-kernel plugin architecture that allows you to extend
              functionality without bloating the core. Plugins can hook into various lifecycle
              events and modify behavior.
            </p>
            <CodeBlock
              code={`import { useVirtualList } from '@oxog/scrollex'
import { infiniteLoaderPlugin, stickyHeadersPlugin } from '@oxog/scrollex/plugins'

function MyList() {
  const { containerRef, virtualItems, totalHeight } = useVirtualList({
    items,
    itemHeight: 50,
    plugins: [
      infiniteLoaderPlugin({ onLoadMore: handleLoadMore }),
      stickyHeadersPlugin({ getGroupKey: item => item.category })
    ]
  })
}`}
            />
          </section>

          <section id="core-plugins" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-6">Core Plugins</h2>
            <p className="text-muted-foreground mb-6">Essential plugins included in the main bundle:</p>

            <div className="space-y-6">
              {corePlugins.map((plugin) => (
                <div key={plugin.name} className="p-6 rounded-xl glass-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", plugin.gradient)}>
                      <plugin.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <p className="text-sm text-muted-foreground">{plugin.description}</p>
                    </div>
                  </div>
                  <CodeBlock code={plugin.code} />
                </div>
              ))}
            </div>
          </section>

          <section id="optional-plugins" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-6">Optional Plugins</h2>
            <p className="text-muted-foreground mb-6">Additional plugins that can be imported separately:</p>

            <div className="space-y-6">
              {optionalPlugins.map((plugin) => (
                <div key={plugin.name} className="p-6 rounded-xl glass-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", plugin.gradient)}>
                      <plugin.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <p className="text-sm text-muted-foreground">{plugin.description}</p>
                    </div>
                  </div>
                  <CodeBlock code={plugin.code} />
                </div>
              ))}
            </div>
          </section>

          <section id="custom-plugins" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-6">Creating Custom Plugins</h2>
            <p className="text-muted-foreground mb-4">
              You can create your own plugins to add custom functionality. Plugins have
              access to lifecycle hooks and the kernel API.
            </p>

            <CodeBlock
              code={`import { createPlugin } from '@oxog/scrollex'

const analyticsPlugin = createPlugin({
  name: 'analytics',
  version: '1.0.0',

  install(kernel) {
    // Called when plugin is registered
    console.log('Analytics plugin installed')
  },

  destroy() {
    // Called when plugin is unregistered
    console.log('Analytics plugin destroyed')
  },

  hooks: {
    onScroll(event) {
      // Track scroll depth
      trackScrollDepth(event.scrollTop / event.scrollHeight)
    },

    onVisibleRangeChange(range) {
      // Track visible items
      trackVisibleItems(range.start, range.end)
    },

    onScrollStart() {
      trackEvent('scroll_start')
    },

    onScrollEnd() {
      trackEvent('scroll_end')
    }
  }
})`}
            />

            <h3 className="text-lg font-semibold mt-8 mb-4">Available Hooks</h3>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium">Hook</th>
                    <th className="text-left px-4 py-3 font-medium">Arguments</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {hooks.map((h) => (
                    <tr key={h.hook} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-violet-400">{h.hook}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.args}</td>
                      <td className="px-4 py-3">{h.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
