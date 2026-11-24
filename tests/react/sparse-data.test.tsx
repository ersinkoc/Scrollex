import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'

// `data` may hold undefined for entries that are still loading: they are items like any other
describe('data with undefined entries', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
  })

  type Cell = string | null | undefined
  const renderItem = ({ item, style }: { item: Cell; style: React.CSSProperties }) => (
    <div style={style} data-cell>{item ?? 'loading'}</div>
  )
  const element = (kind: 'list' | 'grid' | 'masonry', data: Cell[], getItemHeight: (item: Cell) => number = () => 40) =>
    kind === 'list' ? <VirtualList<Cell> data={data} itemHeight={40} height={400} renderItem={renderItem} />
    : kind === 'grid' ? <VirtualGrid<Cell> data={data} columns={2} itemHeight={40} height={400} width={400} renderItem={renderItem} />
    : <VirtualMasonry<Cell> data={data} columns={2} getItemHeight={getItemHeight} height={400} width={400} renderItem={renderItem} />
  const texts = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-cell]')].map((n) => n.textContent)

  it.each(['list', 'grid', 'masonry'] as const)('should render a row for every undefined entry in the %s', async (kind) => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element(kind, ['a', 'b', undefined, undefined, 'e'])) })

    expect(texts(view).sort()).toEqual(['a', 'b', 'e', 'loading', 'loading'])
    view.unmount()
  })

  it.each(['list', 'grid', 'masonry'] as const)('should fill the placeholders in place when the data arrives in the %s', async (kind) => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element(kind, ['a', undefined, undefined])) })
    await act(async () => { view.rerender(element(kind, ['a', 'b', 'c'])) })

    expect(texts(view).sort()).toEqual(['a', 'b', 'c'])
    view.unmount()
  })

  it('should call the masonry height callback with the undefined entry', async () => {
    const getItemHeight = vi.fn((item: Cell) => (item === undefined ? 90 : 40))
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element('masonry', ['a', undefined], getItemHeight)) })

    expect(getItemHeight).toHaveBeenCalledWith(undefined, expect.any(Number))
    view.unmount()
  })

  it.each(['list', 'grid', 'masonry'] as const)('should still drop rows beyond the data when the %s shrinks', async (kind) => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element(kind, ['a', 'b', 'c', 'd', 'e'])) })
    await act(async () => { view.rerender(element(kind, ['a', 'b'])) })

    expect(texts(view).sort()).toEqual(['a', 'b'])
    view.unmount()
  })
})
