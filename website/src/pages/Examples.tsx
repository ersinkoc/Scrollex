import { useState, useRef, useMemo } from 'react'
import { useVirtualList } from '@oxog/scrollex'
import styles from './Examples.module.css'

// Static data for examples (defined outside components to avoid recreating)
const basicItems = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `Item ${i + 1}`,
}))

const dynamicItems = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  text: `Item ${i + 1}`,
  height: 40 + Math.floor(Math.random() * 80),
}))

const cardItems = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  description: `This is a description for card ${i + 1}. It contains some example content to demonstrate the virtualized card layout.`,
  image: `https://picsum.photos/seed/${i}/300/150`,
}))

const tableItems = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: ['Active', 'Inactive', 'Pending'][i % 3],
  date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
}))

// Basic List Example
function BasicListExample() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: basicItems.length,
    estimatedItemHeight: 50,
    overscan: 3,
    containerRef,
  })

  return (
    <div ref={containerRef} className={styles.listContainer}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const item = basicItems[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                height: virtualItem.size,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.25rem',
              }}
              className={styles.listItem}
            >
              {item.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Dynamic Heights Example
function DynamicHeightsExample() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: dynamicItems.length,
    estimatedItemHeight: 80,
    getItemHeight: (index) => dynamicItems[index].height,
    overscan: 5,
    containerRef,
  })

  return (
    <div ref={containerRef} className={styles.listContainer}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const item = dynamicItems[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                height: item.height,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.25rem',
              }}
              className={styles.listItem}
            >
              {item.text} (height: {item.height}px)
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Cards Example
function CardsExample() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: cardItems.length,
    estimatedItemHeight: 220,
    overscan: 2,
    containerRef,
  })

  return (
    <div ref={containerRef} className={styles.listContainer}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const item = cardItems[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                height: virtualItem.size,
                width: '100%',
              }}
              className={styles.card}
            >
              <div
                className={styles.cardImage}
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <div className={styles.cardContent}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Table Example
function TableExample() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { virtualItems, totalSize } = useVirtualList({
    count: tableItems.length,
    estimatedItemHeight: 48,
    overscan: 5,
    containerRef,
  })

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableHeader}>
        <span>ID</span>
        <span>Name</span>
        <span>Email</span>
        <span>Status</span>
        <span>Date</span>
      </div>
      <div ref={containerRef} className={styles.tableContainer}>
        <div style={{ height: totalSize, position: 'relative' }}>
          {virtualItems.map((virtualItem) => {
            const item = tableItems[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: virtualItem.start,
                  height: virtualItem.size,
                  width: '100%',
                }}
                className={styles.tableRow}
              >
                <span>{item.id}</span>
                <span>{item.name}</span>
                <span>{item.email}</span>
                <span className={styles[`status${item.status}`]}>{item.status}</span>
                <span>{item.date}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const examples = [
  { id: 'basic', name: 'Basic List', component: BasicListExample },
  { id: 'dynamic', name: 'Dynamic Heights', component: DynamicHeightsExample },
  { id: 'cards', name: 'Card Layout', component: CardsExample },
  { id: 'table', name: 'Data Table', component: TableExample },
]

export default function Examples() {
  const [activeExample, setActiveExample] = useState('basic')
  const ActiveComponent = examples.find((e) => e.id === activeExample)?.component || BasicListExample

  return (
    <div className={styles.examples}>
      <div className={styles.header}>
        <h1>Live Examples</h1>
        <p>Interactive demos showcasing different use cases</p>
      </div>

      <div className={styles.tabs}>
        {examples.map((example) => (
          <button
            key={example.id}
            className={`${styles.tab} ${activeExample === example.id ? styles.tabActive : ''}`}
            onClick={() => setActiveExample(example.id)}
          >
            {example.name}
          </button>
        ))}
      </div>

      <div className={styles.demo}>
        <ActiveComponent />
      </div>

      <div className={styles.info}>
        <h3>About this example</h3>
        {activeExample === 'basic' && (
          <p>A simple virtualized list with 1,000 items. Each item has a fixed height of 50px. Only visible items are rendered.</p>
        )}
        {activeExample === 'dynamic' && (
          <p>Demonstrates variable height items. Each item has a random height between 40-120px. The virtualization engine handles dynamic heights efficiently.</p>
        )}
        {activeExample === 'cards' && (
          <p>A card-based layout with images and content. Shows how Scrollex handles more complex item layouts with 200 cards.</p>
        )}
        {activeExample === 'table' && (
          <p>A virtualized data table with 5,000 rows. Includes a sticky header and demonstrates efficient handling of tabular data.</p>
        )}
      </div>
    </div>
  )
}
