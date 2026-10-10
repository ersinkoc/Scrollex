import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import { normalizeColumnCount } from '../../src/utils/array.js'

// `columns` that is not a positive integer (0, a fraction, NaN, Infinity) used to divide by zero (grid) or throw
// "RangeError: Invalid array length" and unmount the tree (masonry): it now counts as the nearest usable value.

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
})
const data = Array.from({ length: 50 }, (_, i) => i)
const renderItem = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style} data-i={item}>{item}</div>

async function outcome(kind: 'grid' | 'masonry', columns: number) {
  const errors: string[] = []
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(String(args[0]).slice(0, 80)) })
  let rows = -1
  let sizer = ''
  try {
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(kind === 'grid'
        ? <VirtualGrid data={data} columns={columns} itemHeight={50} height={400} renderItem={renderItem} />
        : <VirtualMasonry data={data} columns={columns} getItemHeight={() => 50} height={400} renderItem={renderItem} />)
    })
    await act(async () => {})
    rows = view.container.querySelectorAll('[data-i]').length
    sizer = (view.container.firstElementChild?.firstElementChild as HTMLElement | null)?.style.height ?? ''
    view.unmount()
  } catch (error) {
    errors.push(`THROW ${String(error).slice(0, 80)}`)
  }
  spy.mockRestore()
  const size = parseFloat(sizer)
  return { rows, size, errors, good: errors.length === 0 && rows > 0 && Number.isFinite(size) && size > 0 }
}


describe('column counts that are not positive integers', () => {
  it('should lay out with a normal column count (control)', async () => {
    expect((await outcome('grid', 3)).good).toBe(true)
    expect((await outcome('masonry', 3)).good).toBe(true)
  })

  it.each([
    ['grid', 0], ['grid', -1], ['grid', Number.NaN], ['grid', 1.5], ['grid', Number.POSITIVE_INFINITY],
    ['masonry', 0], ['masonry', -1], ['masonry', Number.NaN], ['masonry', 1.5], ['masonry', Number.POSITIVE_INFINITY],
  ] as const)('should lay out %s with columns=%s', async (kind, columns) => {
    const result = await outcome(kind, columns)
    expect(result.errors).toEqual([])
    expect(result.good).toBe(true)
  })

  it('should normalize to a whole number of at least 1', () => {
    expect([0, -3, 1, 1.9, 4, Number.NaN, Number.POSITIVE_INFINITY].map(normalizeColumnCount)).toEqual([1, 1, 1, 1, 4, 1, 1])
  })
})
