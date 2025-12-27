import styles from './Docs.module.css'

export default function GettingStarted() {
  return (
    <div className={styles.docs}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav>
            <h3>Getting Started</h3>
            <ul>
              <li><a href="#installation">Installation</a></li>
              <li><a href="#quick-start">Quick Start</a></li>
              <li><a href="#basic-usage">Basic Usage</a></li>
              <li><a href="#configuration">Configuration</a></li>
            </ul>
          </nav>
        </aside>

        <main className={styles.content}>
          <h1>Getting Started</h1>

          <section id="installation">
            <h2>Installation</h2>
            <p>Install Scrollex using your preferred package manager:</p>
            <div className={styles.codeBlock}>
              <pre><code>{`# npm
npm install @oxog/scrollex

# yarn
yarn add @oxog/scrollex

# pnpm
pnpm add @oxog/scrollex`}</code></pre>
            </div>
          </section>

          <section id="quick-start">
            <h2>Quick Start</h2>
            <p>
              Scrollex provides a simple hook-based API for virtualizing large lists.
              Here's the minimal setup to get started:
            </p>
            <div className={styles.codeBlock}>
              <pre><code>{`import { useRef } from 'react'
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
    <div
      ref={containerRef}
      style={{ height: 400, overflow: 'auto' }}
    >
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
}`}</code></pre>
            </div>
          </section>

          <section id="basic-usage">
            <h2>Basic Usage</h2>

            <h3>useVirtualList Hook</h3>
            <p>The main hook accepts a configuration object and returns virtualization helpers:</p>
            <div className={styles.codeBlock}>
              <pre><code>{`const {
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
})`}</code></pre>
            </div>

            <h3>Virtual Items</h3>
            <p>Each item in <code>virtualItems</code> contains:</p>
            <div className={styles.codeBlock}>
              <pre><code>{`{
  index,  // Index in the original array
  key,    // Unique key for React
  start,  // Top position (px)
  size,   // Item height (px)
  end,    // Bottom position (px)
}`}</code></pre>
            </div>
          </section>

          <section id="configuration">
            <h2>Configuration Options</h2>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>count</code></td>
                    <td><code>number</code></td>
                    <td>Required</td>
                    <td>Total number of items to virtualize</td>
                  </tr>
                  <tr>
                    <td><code>containerRef</code></td>
                    <td><code>RefObject</code></td>
                    <td>Required</td>
                    <td>Ref to the scrollable container element</td>
                  </tr>
                  <tr>
                    <td><code>estimatedItemHeight</code></td>
                    <td><code>number</code></td>
                    <td>50</td>
                    <td>Estimated height for unmeasured items</td>
                  </tr>
                  <tr>
                    <td><code>getItemHeight</code></td>
                    <td><code>(index) =&gt; number</code></td>
                    <td>-</td>
                    <td>Optional function returning known item heights</td>
                  </tr>
                  <tr>
                    <td><code>overscan</code></td>
                    <td><code>number</code></td>
                    <td>5</td>
                    <td>Number of extra items to render outside viewport</td>
                  </tr>
                  <tr>
                    <td><code>horizontal</code></td>
                    <td><code>boolean</code></td>
                    <td>false</td>
                    <td>Enable horizontal scrolling</td>
                  </tr>
                  <tr>
                    <td><code>getItemKey</code></td>
                    <td><code>(index) =&gt; string | number</code></td>
                    <td>index</td>
                    <td>Function to generate unique keys</td>
                  </tr>
                  <tr>
                    <td><code>paddingStart</code></td>
                    <td><code>number</code></td>
                    <td>0</td>
                    <td>Padding at the start of the list</td>
                  </tr>
                  <tr>
                    <td><code>paddingEnd</code></td>
                    <td><code>number</code></td>
                    <td>0</td>
                    <td>Padding at the end of the list</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
