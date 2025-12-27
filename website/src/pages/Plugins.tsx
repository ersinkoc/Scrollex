import { Link } from 'react-router-dom'
import styles from './Docs.module.css'

const corePlugins = [
  {
    name: 'Infinite Loader',
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
    description: 'Remember and restore scroll position across navigation.',
    code: `import { scrollRestorationPlugin } from '@oxog/scrollex/plugins'

const plugin = scrollRestorationPlugin({
  key: 'my-list',
  storage: sessionStorage
})`,
  },
  {
    name: 'Bidirectional',
    description: 'Enable horizontal scrolling with full virtualization support.',
    code: `import { bidirectionalPlugin } from '@oxog/scrollex/plugins'

const plugin = bidirectionalPlugin({
  direction: 'horizontal',
  itemWidth: 200
})`,
  },
  {
    name: 'Debug Panel',
    description: 'Development tool for monitoring virtualization performance.',
    code: `import { debugPanelPlugin } from '@oxog/scrollex/plugins'

const plugin = debugPanelPlugin({
  position: 'bottom-right',
  showFPS: true,
  showMemory: true
})`,
  },
]

export default function Plugins() {
  return (
    <div className={styles.docs}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <nav>
            <h3>Plugins</h3>
            <ul>
              <li><a href="#overview">Overview</a></li>
              <li><a href="#core-plugins">Core Plugins</a></li>
              <li><a href="#optional-plugins">Optional Plugins</a></li>
              <li><a href="#custom-plugins">Custom Plugins</a></li>
            </ul>
          </nav>
        </aside>

        <main className={styles.content}>
          <h1>Plugins</h1>

          <section id="overview">
            <h2>Overview</h2>
            <p>
              Scrollex uses a micro-kernel plugin architecture that allows you to extend
              functionality without bloating the core. Plugins can hook into various lifecycle
              events and modify behavior.
            </p>
            <div className={styles.codeBlock}>
              <pre><code>{`import { useVirtualList } from '@oxog/scrollex'
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
}`}</code></pre>
            </div>
          </section>

          <section id="core-plugins">
            <h2>Core Plugins</h2>
            <p>Essential plugins included in the main bundle:</p>

            {corePlugins.map((plugin) => (
              <div key={plugin.name} className={styles.pluginCard}>
                <h3>{plugin.name}</h3>
                <p>{plugin.description}</p>
                <div className={styles.codeBlock}>
                  <pre><code>{plugin.code}</code></pre>
                </div>
              </div>
            ))}
          </section>

          <section id="optional-plugins">
            <h2>Optional Plugins</h2>
            <p>Additional plugins that can be imported separately:</p>

            {optionalPlugins.map((plugin) => (
              <div key={plugin.name} className={styles.pluginCard}>
                <h3>{plugin.name}</h3>
                <p>{plugin.description}</p>
                <div className={styles.codeBlock}>
                  <pre><code>{plugin.code}</code></pre>
                </div>
              </div>
            ))}
          </section>

          <section id="custom-plugins">
            <h2>Creating Custom Plugins</h2>
            <p>
              You can create your own plugins to add custom functionality. Plugins have
              access to lifecycle hooks and the kernel API.
            </p>
            <div className={styles.codeBlock}>
              <pre><code>{`import { createPlugin } from '@oxog/scrollex'

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
})`}</code></pre>
            </div>

            <h3>Available Hooks</h3>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Hook</th>
                    <th>Arguments</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>onScroll</code></td>
                    <td><code>ScrollEvent</code></td>
                    <td>Called on every scroll frame (RAF throttled)</td>
                  </tr>
                  <tr>
                    <td><code>onScrollStart</code></td>
                    <td>-</td>
                    <td>Called when scrolling begins</td>
                  </tr>
                  <tr>
                    <td><code>onScrollEnd</code></td>
                    <td>-</td>
                    <td>Called when scrolling stops (debounced)</td>
                  </tr>
                  <tr>
                    <td><code>onVisibleRangeChange</code></td>
                    <td><code>VisibleRange</code></td>
                    <td>Called when visible items change</td>
                  </tr>
                  <tr>
                    <td><code>onItemMeasured</code></td>
                    <td><code>index, size</code></td>
                    <td>Called when an item is measured</td>
                  </tr>
                  <tr>
                    <td><code>onResize</code></td>
                    <td><code>Size</code></td>
                    <td>Called when container is resized</td>
                  </tr>
                  <tr>
                    <td><code>onLoadMore</code></td>
                    <td><code>direction</code></td>
                    <td>Called when more items should load</td>
                  </tr>
                  <tr>
                    <td><code>onItemsChange</code></td>
                    <td><code>items[]</code></td>
                    <td>Called when items array changes</td>
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
