import React, { useRef } from 'react'
import { render, act } from '@testing-library/react'
import { useVirtualList } from '../../src/react/hooks/use-virtual-list.js'
import { useVirtualGrid } from '../../src/react/hooks/use-virtual-grid.js'
import { useVirtualMasonry } from '../../src/react/hooks/use-virtual-masonry.js'
import { rekeyItems } from '../../src/react/hooks/items-range.js'

// The documented hook usage indexes the caller's data with virtualItem.index: after the data shrank that must be safe
describe('hooks when the data shrinks', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
  })

  type Item = { name: string }
  const make = (n: number): Item[] => Array.from({ length: n }, (_, i) => ({ name: `item ${i}` }))

  function ListUser({ items }: { items: Item[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { virtualItems } = useVirtualList({ count: items.length, estimatedItemHeight: 50, containerRef })
    return <div ref={containerRef}>{virtualItems.map((v) => <div key={v.key}>{items[v.index]!.name}</div>)}</div>
  }
  function GridUser({ items }: { items: Item[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { virtualItems } = useVirtualGrid({ count: items.length, columns: 2, rowHeight: 50, containerRef })
    return <div ref={containerRef}>{virtualItems.map((v) => <div key={v.key}>{items[v.index]!.name}</div>)}</div>
  }
  function MasonryUser({ items }: { items: Item[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { virtualItems } = useVirtualMasonry({ count: items.length, columns: 2, getItemHeight: () => 50, containerRef })
    return <div ref={containerRef}>{virtualItems.map((v) => <div key={v.key}>{items[v.index]!.name}</div>)}</div>
  }

  const users = { list: ListUser, grid: GridUser, masonry: MasonryUser }

  it.each(['list', 'grid', 'masonry'] as const)('should not hand out items beyond the data in the %s hook', async (kind) => {
    const User = users[kind]
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<User items={make(100)} />) })

    await act(async () => { view.rerender(<User items={make(3)} />) })
    expect(view.container.textContent).toBe('item 0item 1item 2')

    await act(async () => { view.rerender(<User items={make(0)} />) })
    expect(view.container.textContent).toBe('')

    await act(async () => { view.rerender(<User items={make(5)} />) })
    expect(view.container.textContent).toBe('item 0item 1item 2item 3item 4')

    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
    view.unmount()
  })

  it('should drop the items at or past the count in rekeyItems and keep the others', () => {
    const item = (index: number) => ({ index, key: index, start: index * 10, end: index * 10 + 10, size: 10, lane: 0 })
    const items = [item(0), item(1), item(2), item(3)]

    expect(rekeyItems(items, 4, (i) => i)).toBe(items)
    expect(rekeyItems(items, 2, (i) => i).map((x) => x.index)).toEqual([0, 1])
    expect(rekeyItems(items, 0, (i) => i)).toEqual([])
    expect(rekeyItems(items, 3, (i) => `k${i}`).map((x) => x.key)).toEqual(['k0', 'k1', 'k2'])
  })
})
