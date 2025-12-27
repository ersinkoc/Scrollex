import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Zap,
  Puzzle,
  Gauge,
  Package,
  Code2,
  Accessibility,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Layers,
  Infinity,
  GripVertical,
  Bug,
  RotateCcw,
  ChevronRight,
  Terminal,
  Star,
} from 'lucide-react'
import { cn } from '../lib/utils'

// Features data
const features = [
  {
    icon: Zap,
    title: 'Zero Dependencies',
    description: 'Lightweight and blazing fast. No external dependencies, just pure React.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Puzzle,
    title: 'Plugin Architecture',
    description: 'Micro-kernel design with composable plugins for any virtualization need.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Gauge,
    title: 'High Performance',
    description: 'RAF-based scroll handling with optimized DOM updates for buttery smooth 60fps.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Package,
    title: 'Tree-Shakeable',
    description: 'Import only what you need. Minimal bundle impact with ~3KB core size.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Code2,
    title: 'TypeScript First',
    description: 'Full TypeScript support with comprehensive type definitions and strict mode.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Accessibility,
    title: 'Accessible',
    description: 'Built with accessibility in mind. Keyboard navigation and ARIA attributes included.',
    gradient: 'from-indigo-500 to-violet-500',
  },
]

// Plugins data
const plugins = [
  { icon: Infinity, name: 'Infinite Scroll', desc: 'Load more content automatically' },
  { icon: Layers, name: 'Sticky Headers', desc: 'Group headers that stick on scroll' },
  { icon: GripVertical, name: 'Dynamic Heights', desc: 'Variable item heights support' },
  { icon: ArrowRight, name: 'Bidirectional', desc: 'Horizontal and vertical scrolling' },
  { icon: Bug, name: 'Debug Panel', desc: 'Development performance insights' },
  { icon: RotateCcw, name: 'Scroll Restoration', desc: 'Remember scroll position' },
]

// Demo virtualization
const TOTAL_ITEMS = 10000
const ITEM_HEIGHT = 64

function useSimpleVirtualList(
  containerRef: React.RefObject<HTMLDivElement>,
  itemCount: number,
  itemHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => setScrollTop(container.scrollTop)
    const handleResize = () => setContainerHeight(container.clientHeight)

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [containerRef])

  const totalSize = itemCount * itemHeight
  const overscan = 3
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)

  const virtualItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({ index: i, key: i, start: i * itemHeight, size: itemHeight })
  }

  return { virtualItems, totalSize }
}

function VirtualListDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, TOTAL_ITEMS, ITEM_HEIGHT)

  return (
    <div
      ref={containerRef}
      className="h-[400px] overflow-auto rounded-xl bg-card/50 border border-border/50"
    >
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((item) => (
          <div
            key={item.key}
            style={{ position: 'absolute', top: item.start, height: item.size, width: '100%' }}
            className="flex items-center gap-4 px-4 border-b border-border/30 hover:bg-secondary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-sm font-medium text-violet-400">
              {item.index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Item {item.index + 1}</div>
              <div className="text-sm text-muted-foreground truncate">
                Virtualized row rendering at 60fps with 10,000 items
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  )
}

const exampleCode = `import { useVirtualList } from '@oxog/scrollex'

function MyList({ items }) {
  const containerRef = useRef(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: items.length,
    estimatedItemHeight: 50,
    containerRef,
  })

  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((row) => (
          <div
            key={row.key}
            style={{
              position: 'absolute',
              top: row.start,
              height: row.size,
            }}
          >
            {items[row.index].name}
          </div>
        ))}
      </div>
    </div>
  )
}`

export default function Home() {
  const [copied, setCopied] = useState(false)

  const copyInstall = () => {
    navigator.clipboard.writeText('npm install @oxog/scrollex')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">v1.0.0 — Zero Dependencies</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Virtual Scrolling for{' '}
              <span className="text-gradient">React</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              A lightweight, plugin-based virtualization library with micro-kernel architecture.
              Render millions of items with buttery smooth 60fps performance.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/getting-started"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://github.com/ersinkoc/Scrollex"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass hover:bg-white/10 font-semibold transition-all"
              >
                <Star className="w-4 h-4" />
                Star on GitHub
              </a>
            </div>

            {/* Install command */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl glass animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <code className="text-sm font-mono">npm install @oxog/scrollex</code>
              <button
                onClick={copyInstall}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Live Demo — <span className="text-gradient">10,000 Items</span>
              </h2>
              <p className="text-muted-foreground">
                Scroll through thousands of items at buttery smooth 60fps
              </p>
            </div>

            {/* Browser Frame */}
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-violet-500/10">
              {/* Browser Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    scrollex.oxog.dev/demo
                  </div>
                </div>
              </div>
              {/* Demo Content */}
              <div className="p-4 bg-background/50">
                <VirtualListDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-dots" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why <span className="text-gradient">Scrollex</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for performance, designed for developers. Everything you need for virtualization.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl glass-card hover-lift hover-glow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                  feature.gradient
                )}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plugins Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built-in <span className="text-gradient">Plugins</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Extend functionality with our composable plugin system
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {plugins.map((plugin) => (
              <div
                key={plugin.name}
                className="flex items-center gap-4 p-4 rounded-xl glass-card hover-border transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <plugin.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="font-medium text-sm">{plugin.name}</div>
                  <div className="text-xs text-muted-foreground">{plugin.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/plugins"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              View all plugins
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple <span className="text-gradient">API</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started with just a few lines of code
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-violet-500/10">
              {/* Code Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border-b border-border/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-sm text-muted-foreground font-mono">MyList.tsx</span>
              </div>
              <SyntaxHighlighter
                language="tsx"
                style={oneDark}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  background: '#0d1117',
                  fontSize: '0.875rem',
                }}
              >
                {exampleCode}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="p-12 rounded-3xl glass-card relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to virtualize?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Get started in less than 5 minutes with our comprehensive documentation.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/getting-started"
                    className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all"
                  >
                    Read the Docs
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/examples"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass hover:bg-white/10 font-semibold transition-all"
                  >
                    View Examples
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
