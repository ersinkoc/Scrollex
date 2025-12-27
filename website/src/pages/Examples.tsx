import { useState, useRef, useEffect } from 'react'
import { List, LayoutGrid, CreditCard, Table, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

// Simple virtualization hook
const OVERSCAN = 3

function useSimpleVirtualList(
  containerRef: React.RefObject<HTMLDivElement>,
  itemCount: number,
  getItemHeight: (index: number) => number
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

  const positions: number[] = []
  let totalSize = 0
  for (let i = 0; i < itemCount; i++) {
    positions.push(totalSize)
    totalSize += getItemHeight(i)
  }

  let startIndex = 0
  for (let i = 0; i < itemCount; i++) {
    if (positions[i] + getItemHeight(i) > scrollTop) {
      startIndex = Math.max(0, i - OVERSCAN)
      break
    }
  }

  let endIndex = startIndex
  for (let i = startIndex; i < itemCount; i++) {
    if (positions[i] > scrollTop + containerHeight) {
      endIndex = Math.min(itemCount - 1, i + OVERSCAN)
      break
    }
    endIndex = i
  }
  endIndex = Math.min(itemCount - 1, endIndex + OVERSCAN)

  const virtualItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({ index: i, key: i, start: positions[i], size: getItemHeight(i) })
  }

  return { virtualItems, totalSize }
}

// Static data
const basicItems = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `Item ${i + 1}` }))
const dynamicItems = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  text: `Item ${i + 1}`,
  height: 40 + Math.floor(Math.random() * 80),
}))
const cardItems = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  title: `Card ${i + 1}`,
  description: `Description for card ${i + 1}. Demonstrating virtualized card layout.`,
  image: `https://picsum.photos/seed/${i}/300/150`,
}))
const tableItems = Array.from({ length: 5000 }, (_, i) => ({
  id: i,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: ['Active', 'Inactive', 'Pending'][i % 3] as 'Active' | 'Inactive' | 'Pending',
  date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
}))

function BasicListExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, basicItems.length, () => 56)

  return (
    <div ref={containerRef} className="h-[400px] overflow-auto rounded-xl bg-card/50 border border-border/50">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((vItem) => {
          const item = basicItems[vItem.index]
          return (
            <div
              key={vItem.key}
              style={{ position: 'absolute', top: vItem.start, height: vItem.size, width: '100%' }}
              className="flex items-center gap-4 px-4 border-b border-border/30 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm font-medium text-violet-400">
                {vItem.index + 1}
              </div>
              <span className="font-medium">{item.text}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DynamicHeightsExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, dynamicItems.length, (i) => dynamicItems[i].height)

  return (
    <div ref={containerRef} className="h-[400px] overflow-auto rounded-xl bg-card/50 border border-border/50">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((vItem) => {
          const item = dynamicItems[vItem.index]
          return (
            <div
              key={vItem.key}
              style={{ position: 'absolute', top: vItem.start, height: item.height, width: '100%' }}
              className="flex items-center gap-4 px-4 border-b border-border/30 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm font-medium text-emerald-400">
                {vItem.index + 1}
              </div>
              <div className="flex-1">
                <span className="font-medium">{item.text}</span>
                <span className="text-sm text-muted-foreground ml-2">({item.height}px)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CardsExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, cardItems.length, () => 180)

  return (
    <div ref={containerRef} className="h-[400px] overflow-auto rounded-xl bg-card/50 border border-border/50 p-4">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((vItem) => {
          const item = cardItems[vItem.index]
          return (
            <div
              key={vItem.key}
              style={{ position: 'absolute', top: vItem.start, height: vItem.size - 16, width: 'calc(100% - 0px)' }}
              className="mb-4"
            >
              <div className="h-full rounded-xl border border-border/50 bg-secondary/30 overflow-hidden flex hover:border-violet-500/30 transition-colors">
                <div
                  className="w-32 h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="flex-1 p-4">
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TableExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { virtualItems, totalSize } = useSimpleVirtualList(containerRef, tableItems.length, () => 48)

  const statusColors = {
    Active: 'bg-emerald-500/10 text-emerald-400',
    Inactive: 'bg-red-500/10 text-red-400',
    Pending: 'bg-amber-500/10 text-amber-400',
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-secondary/50 text-sm font-medium text-muted-foreground">
        <span>ID</span>
        <span>Name</span>
        <span>Email</span>
        <span>Status</span>
        <span>Date</span>
      </div>
      <div ref={containerRef} className="h-[350px] overflow-auto bg-card/50">
        <div style={{ height: totalSize, position: 'relative' }}>
          {virtualItems.map((vItem) => {
            const item = tableItems[vItem.index]
            return (
              <div
                key={vItem.key}
                style={{ position: 'absolute', top: vItem.start, height: vItem.size, width: '100%' }}
                className="grid grid-cols-5 gap-4 px-4 items-center text-sm border-b border-border/30 hover:bg-secondary/30 transition-colors"
              >
                <span className="text-muted-foreground">{item.id}</span>
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground truncate">{item.email}</span>
                <span>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[item.status])}>
                    {item.status}
                  </span>
                </span>
                <span className="text-muted-foreground">{item.date}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const examples = [
  { id: 'basic', name: 'Basic List', icon: List, count: '1,000', component: BasicListExample },
  { id: 'dynamic', name: 'Dynamic Heights', icon: LayoutGrid, count: '500', component: DynamicHeightsExample },
  { id: 'cards', name: 'Card Layout', icon: CreditCard, count: '200', component: CardsExample },
  { id: 'table', name: 'Data Table', icon: Table, count: '5,000', component: TableExample },
]

const descriptions = {
  basic: 'A simple virtualized list with 1,000 items. Each item has a fixed height of 56px. Only visible items are rendered.',
  dynamic: 'Demonstrates variable height items. Each item has a random height between 40-120px.',
  cards: 'A card-based layout with images and content. Shows how to handle complex item layouts.',
  table: 'A virtualized data table with 5,000 rows. Includes a sticky header for better UX.',
}

export default function Examples() {
  const [activeExample, setActiveExample] = useState('basic')
  const ActiveComponent = examples.find((e) => e.id === activeExample)?.component || BasicListExample

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Live <span className="text-gradient">Examples</span>
          </h1>
          <p className="text-muted-foreground">
            Interactive demos showcasing different virtualization use cases
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeExample === example.id
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <example.icon className="w-4 h-4" />
              {example.name}
              <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{example.count}</span>
            </button>
          ))}
        </div>

        {/* Demo */}
        <div className="rounded-2xl border border-border/50 overflow-hidden shadow-2xl shadow-violet-500/5">
          {/* Browser Frame */}
          <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/50">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                scrollex.oxog.dev/examples/{activeExample}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 bg-background/50">
            <ActiveComponent />
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-6 rounded-xl glass-card">
          <h3 className="font-semibold mb-2">About this example</h3>
          <p className="text-sm text-muted-foreground">
            {descriptions[activeExample as keyof typeof descriptions]}
          </p>
        </div>
      </div>
    </div>
  )
}
