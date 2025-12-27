import { useRef, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Home.module.css'

const features = [
  {
    icon: '🚀',
    title: 'Zero Dependencies',
    description: 'Lightweight and fast with no external dependencies. Just React.',
  },
  {
    icon: '🔌',
    title: 'Plugin Architecture',
    description: 'Micro-kernel design with composable plugins for any use case.',
  },
  {
    icon: '⚡',
    title: 'High Performance',
    description: 'RAF-based scroll handling with optimized DOM updates.',
  },
  {
    icon: '📦',
    title: 'Tree-Shakeable',
    description: 'Import only what you need. Minimal bundle impact.',
  },
  {
    icon: '🎯',
    title: 'TypeScript First',
    description: 'Full TypeScript support with comprehensive type definitions.',
  },
  {
    icon: '♿',
    title: 'Accessible',
    description: 'Built with accessibility in mind. ARIA attributes included.',
  },
]

const plugins = [
  { name: 'Infinite Scroll', desc: 'Load more content automatically' },
  { name: 'Sticky Headers', desc: 'Group headers that stick on scroll' },
  { name: 'Dynamic Heights', desc: 'Variable item heights support' },
  { name: 'Bidirectional', desc: 'Horizontal and vertical scrolling' },
  { name: 'Debug Panel', desc: 'Development performance insights' },
  { name: 'Scroll Restoration', desc: 'Remember scroll position' },
]

// Demo items data
const TOTAL_ITEMS = 10000
const ITEM_HEIGHT = 72
const OVERSCAN = 3

// Simple virtualization hook for demo
function useSimpleVirtualList(containerRef: React.RefObject<HTMLDivElement>, itemCount: number, itemHeight: number) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollTop(container.scrollTop)
    }

    const handleResize = () => {
      setContainerHeight(container.clientHeight)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [containerRef])

  const totalSize = itemCount * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN)
  const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + OVERSCAN)

  const virtualItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      key: i,
      start: i * itemHeight,
      size: itemHeight,
    })
  }

  return { virtualItems, totalSize }
}

// Demo component
function VirtualListDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, TOTAL_ITEMS, ITEM_HEIGHT)

  return (
    <div ref={containerRef} className={styles.demoContainer}>
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
            className={styles.demoItem}
          >
            <div className={styles.demoItemTitle}>Item {virtualItem.index + 1}</div>
            <div className={styles.demoItemDesc}>
              This is a virtualized item demonstrating smooth scrolling with 10,000 items.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>v1.0.0 - Zero Dependencies</div>
          <h1 className={styles.heroTitle}>
            Virtual Scrolling for{' '}
            <span className={styles.gradient}>React</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A lightweight, plugin-based virtualization library with micro-kernel architecture.
            Render millions of items with ease.
          </p>
          <div className={styles.heroActions}>
            <Link to="/getting-started" className={styles.primaryBtn}>
              Get Started
            </Link>
            <a
              href="https://github.com/oxog/scrollex"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryBtn}
            >
              View on GitHub
            </a>
          </div>
          <div className={styles.installCmd}>
            <code>npm install @oxog/scrollex</code>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText('npm install @oxog/scrollex')}
            >
              Copy
            </button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className={styles.demoSection}>
        <div className={styles.demoWrapper}>
          <div className={styles.demoHeader}>
            <h2>Live Demo - 10,000 Items</h2>
            <p>Scroll through thousands of items at 60fps</p>
          </div>
          <VirtualListDemo />
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContent}>
          <h2 className={styles.sectionTitle}>Why Scrollex?</h2>
          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plugins Section */}
      <section className={styles.pluginsSection}>
        <div className={styles.pluginsContent}>
          <h2 className={styles.sectionTitle}>Built-in Plugins</h2>
          <p className={styles.sectionSubtitle}>
            Extend functionality with our composable plugin system
          </p>
          <div className={styles.pluginsGrid}>
            {plugins.map((plugin) => (
              <div key={plugin.name} className={styles.pluginCard}>
                <h4 className={styles.pluginName}>{plugin.name}</h4>
                <p className={styles.pluginDesc}>{plugin.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/plugins" className={styles.viewAllBtn}>
            View All Plugins
          </Link>
        </div>
      </section>

      {/* Code Example Section */}
      <section className={styles.codeSection}>
        <div className={styles.codeContent}>
          <h2 className={styles.sectionTitle}>Simple API</h2>
          <div className={styles.codeBlock}>
            <pre>
              <code>{`import { useRef } from 'react'
import { useVirtualList } from '@oxog/scrollex'

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: \`Item \${i + 1}\`
}))

function MyList() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: items.length,
    estimatedItemHeight: 50,
    overscan: 5,
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
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2>Ready to virtualize?</h2>
          <p>Get started in less than 5 minutes</p>
          <Link to="/getting-started" className={styles.primaryBtn}>
            Read the Docs
          </Link>
        </div>
      </section>
    </div>
  )
}
