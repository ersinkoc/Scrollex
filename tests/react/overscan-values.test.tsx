import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import { createKernel } from '../../src/kernel/kernel.js'
import { normalizeOverscan } from '../../src/utils/array.js'

// An overscan that is NaN or negative used to drop rows that are visible (NaN: all of them): it counts as 0 now.

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})
const data = Array.from({ length: 200 }, (_, i) => i)
const renderItem = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style} data-i={item}>{item}</div>

async function rendered(kind: 'list' | 'grid' | 'masonry', overscan: number) {
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(kind === 'list'
      ? <VirtualList data={data} itemHeight={50} height={400} overscan={overscan} renderItem={renderItem} />
      : kind === 'grid'
        ? <VirtualGrid data={data} columns={2} itemHeight={50} height={400} overscan={overscan} renderItem={renderItem} />
        : <VirtualMasonry data={data} columns={2} getItemHeight={() => 50} height={400} overscan={overscan} renderItem={renderItem} />)
  })
  await act(async () => {})
  const ids = [...view.container.querySelectorAll('[data-i]')].map((e) => Number((e as HTMLElement).dataset['i']))
  view.unmount()
  return ids
}


describe('overscan values that are not non-negative whole numbers', () => {
  it.each(['list', 'grid', 'masonry'] as const)('should render at least the visible rows in a %s', async (kind) => {
    const zero = await rendered(kind, 0)
    const two = await rendered(kind, 2)
    expect(zero.length).toBeGreaterThan(0) // control
    expect(two.length).toBeGreaterThan(zero.length) // control
    for (const bad of [Number.NaN, -1, 1.5]) {
      const ids = await rendered(kind, bad)
      expect(ids.length).toBeGreaterThanOrEqual(zero.length)
      expect(ids.every((i) => Number.isInteger(i))).toBe(true)
    }
  })

  it('should normalize in the kernel on creation and on configure', () => {
    expect(createKernel({ overscan: Number.NaN }).getOptions().overscan).toBe(0)
    const kernel = createKernel({ overscan: 3 })
    kernel.configure({ overscan: -2 })
    expect(kernel.getOptions().overscan).toBe(0)
    kernel.configure({ overscan: 2.7 })
    expect(kernel.getOptions().overscan).toBe(2)
  })

  it('should keep Infinity (every row) and whole numbers', () => {
    expect([0, 3, 2.9, -1, Number.NaN, Number.POSITIVE_INFINITY].map(normalizeOverscan)).toEqual([0, 3, 2, 0, 0, Number.POSITIVE_INFINITY])
  })
})
