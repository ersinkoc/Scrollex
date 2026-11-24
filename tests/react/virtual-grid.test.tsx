import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'

describe('VirtualGrid', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 600, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  const data = Array.from({ length: 20 }, (_, i) => i)

  function Grid({ columns, itemHeight, gap = 0 }: { columns: number; itemHeight: number; gap?: number }) {
    return (
      <VirtualGrid
        data={data}
        columns={columns}
        itemHeight={itemHeight}
        gap={gap}
        height={600}
        renderItem={({ item, style }) => <div data-testid={`item-${item}`} style={style} />}
      />
    )
  }

  it('should re-layout when columns and itemHeight change after mount', () => {
    let result!: ReturnType<typeof render>
    act(() => {
      result = render(<Grid columns={4} itemHeight={50} />)
    })
    expect(result.getByTestId('item-2').style.transform).toBe('translate(200px, 0px)')

    act(() => {
      result.rerender(<Grid columns={2} itemHeight={80} />)
    })

    expect(result.getByTestId('item-2').style.transform).toBe('translate(0px, 80px)')
    expect(result.getByTestId('item-2').style.width).toBe('200px')
  })

  it('should re-layout when gap changes after mount', () => {
    let result!: ReturnType<typeof render>
    act(() => {
      result = render(<Grid columns={4} itemHeight={50} />)
    })

    act(() => {
      result.rerender(<Grid columns={4} itemHeight={50} gap={10} />)
    })

    expect(result.getByTestId('item-5').style.transform).toBe('translate(102.5px, 60px)')
  })

  it('should key cells from the current data after the data grows', () => {
    type Row = { id: string }
    const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const keyed = (data: Row[]) => (
      <VirtualGrid
        data={data}
        columns={3}
        itemHeight={50}
        height={400}
        getItemKey={(index, items) => (items[index] as Row).id}
        renderItem={({ item, style }) => <div data-testid="cell" style={style}>{(item as Row).id}</div>}
      />
    )

    let result!: ReturnType<typeof render>
    act(() => {
      result = render(keyed(rows(3)))
    })
    act(() => {
      result.rerender(keyed(rows(60)))
    })

    expect(result.queryAllByTestId('cell').length).toBeGreaterThan(3)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('should keep each cell in its own DOM node when the data is reordered without changing its length', () => {
    type Row = { id: string }
    const abc: Row[] = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
    const keyed = (data: Row[]) => (
      <VirtualGrid
        data={data}
        columns={2}
        itemHeight={50}
        height={400}
        getItemKey={(index, items) => (items[index] as Row).id}
        renderItem={({ item, style }) => <div data-testid={(item as Row).id} style={style}>{(item as Row).id}</div>}
      />
    )
    let result!: ReturnType<typeof render>
    act(() => { result = render(keyed(abc)) })
    const wrapperOf = (id: string) => result.getByTestId(id).parentElement
    const a = wrapperOf('a')

    act(() => { result.rerender(keyed([abc[1]!, abc[0]!, abc[2]!, abc[3]!])) })

    expect(wrapperOf('a')).toBe(a)
  })
})

describe('VirtualGrid overscan', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 600, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  const data = Array.from({ length: 300 }, (_, i) => i)
  const grid = (overscan: number) => (
    <VirtualGrid
      data={data}
      columns={3}
      itemHeight={50}
      height={400}
      overscan={overscan}
      renderItem={({ item, style }) => <div style={style}>{item}</div>}
    />
  )
  const rendered = (view: ReturnType<typeof render>) => view.container.querySelectorAll('[data-index]').length

  it('should apply a new overscan after mount', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(grid(0)) })
    expect(rendered(view)).toBe(27) // 9 rows x 3 columns

    act(() => { view.rerender(grid(6)) })
    expect(rendered(view)).toBe(45)

    act(() => { view.rerender(grid(1)) })
    expect(rendered(view)).toBe(30)
  })
})

describe('VirtualGrid row count', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  const grid = (count: number, columns: number | 'auto' = 4) => (
    <VirtualGrid
      data={Array.from({ length: count }, (_, i) => i)}
      columns={columns}
      minColumnWidth={100}
      itemHeight={100}
      height={400}
      width={400}
      renderItem={({ item, style }) => <div style={style}>{item}</div>}
    />
  )
  const rowCount = (view: ReturnType<typeof render>) => view.container.querySelector('[aria-rowcount]')!.getAttribute('aria-rowcount')

  it('should report the rows of the grid right after mounting', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(grid(100)) })

    expect(rowCount(view)).toBe('25')
  })

  it('should follow the item count and the column count without lagging behind', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(grid(101)) })
    expect(rowCount(view)).toBe('26')

    await act(async () => { view.rerender(grid(120)) })
    expect(rowCount(view)).toBe('30')

    await act(async () => { view.rerender(grid(120, 5)) })
    expect(rowCount(view)).toBe('24')

    await act(async () => { view.rerender(grid(0)) })
    expect(rowCount(view)).toBe('0')
  })

  it('should use the measured column count for automatic columns', async () => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(grid(100, 'auto')) })

    expect(rowCount(view)).toBe('25')
  })
})
