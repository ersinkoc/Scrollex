import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Package, Zap, Settings, BookOpen, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

const sidebarItems = [
  { id: 'installation', label: 'Installation', icon: Package },
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'basic-usage', label: 'Basic Usage', icon: BookOpen },
  { id: 'configuration', label: 'Configuration', icon: Settings },
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

export default function GettingStarted() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex gap-8 max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
              Getting Started
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
              Getting <span className="text-gradient">Started</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Learn how to install and use Scrollex in your React application.
            </p>
          </div>

          <section id="installation" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-violet-400" />
              </div>
              Installation
            </h2>
            <p className="text-muted-foreground mb-4">
              Install Scrollex using your preferred package manager:
            </p>
            <CodeBlock
              language="bash"
              code={`# npm
npm install @oxog/scrollex

# yarn
yarn add @oxog/scrollex

# pnpm
pnpm add @oxog/scrollex`}
            />
          </section>

          <section id="quick-start" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              Quick Start
            </h2>
            <p className="text-muted-foreground mb-4">
              Scrollex provides a simple hook-based API for virtualizing large lists.
              Here's the minimal setup to get started:
            </p>
            <CodeBlock
              code={`import { useRef } from 'react'
import { useVirtualList } from '@oxog/scrollex'

const items = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: \`Item \${i + 1}\`
}))

function MyList() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
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
            {items[virtualItem.index].text}
          </div>
        ))}
      </div>
    </div>
  )
}`}
            />
          </section>

          <section id="basic-usage" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
              Basic Usage
            </h2>

            <h3 className="text-lg font-semibold mt-6 mb-3">useVirtualList Hook</h3>
            <p className="text-muted-foreground mb-4">
              The main hook accepts a configuration object and returns virtualization helpers:
            </p>
            <CodeBlock
              code={`const {
  virtualItems,      // Array of visible virtual items
  totalSize,         // Total height of all items
  scrollOffset,      // Current scroll position
  isScrolling,       // Whether currently scrolling
  scrollTo,          // Scroll to specific offset
  scrollToIndex,     // Scroll to specific item index
  measureElement,    // Callback to measure item
  range,             // Visible range info
} = useVirtualList({
  count,               // Total number of items
  estimatedItemHeight, // Estimated height per item
  containerRef,        // Ref to scrollable container
  overscan,            // Extra items to render (default: 5)
  getItemHeight,       // Optional: function for known heights
  horizontal,          // Enable horizontal scrolling
})`}
            />

            <h3 className="text-lg font-semibold mt-6 mb-3">Virtual Items</h3>
            <p className="text-muted-foreground mb-4">
              Each item in <code className="px-2 py-1 rounded bg-secondary text-sm">virtualItems</code> contains:
            </p>
            <CodeBlock
              code={`{
  index,  // Index in the original array
  key,    // Unique key for React
  start,  // Top position (px)
  size,   // Item height (px)
  end,    // Bottom position (px)
}`}
            />
          </section>

          <section id="configuration" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Settings className="w-4 h-4 text-amber-400" />
              </div>
              Configuration Options
            </h2>

            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium">Option</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Default</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ['count', 'number', 'Required', 'Total number of items to virtualize'],
                    ['containerRef', 'RefObject', 'Required', 'Ref to the scrollable container'],
                    ['estimatedItemHeight', 'number', '50', 'Estimated height for unmeasured items'],
                    ['getItemHeight', '(index) => number', '-', 'Function returning known item heights'],
                    ['overscan', 'number', '5', 'Extra items to render outside viewport'],
                    ['horizontal', 'boolean', 'false', 'Enable horizontal scrolling'],
                    ['getItemKey', '(index) => key', 'index', 'Function to generate unique keys'],
                    ['paddingStart', 'number', '0', 'Padding at the start of the list'],
                    ['paddingEnd', 'number', '0', 'Padding at the end of the list'],
                  ].map(([option, type, def, desc]) => (
                    <tr key={option} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-violet-400">{option}</td>
                      <td className="px-4 py-3 text-muted-foreground">{type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{def}</td>
                      <td className="px-4 py-3">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Next Steps */}
          <div className="p-6 rounded-xl glass-card">
            <h3 className="font-semibold mb-4">Next Steps</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href="/api"
                className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <div className="flex-1">
                  <div className="font-medium">API Reference</div>
                  <div className="text-sm text-muted-foreground">Explore the full API</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="/examples"
                className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <div className="flex-1">
                  <div className="font-medium">Examples</div>
                  <div className="text-sm text-muted-foreground">See live demos</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
