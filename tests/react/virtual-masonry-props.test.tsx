import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'

describe('VirtualMasonry props', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor
  let savedScrollTop: PropertyDescriptor | undefined
  const scrollTops = new WeakMap<object, number>()

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    savedScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 620, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    // jsdom ignores scrollTop writes; record them
    Object.defineProperty(Element.prototype, 'scrollTop', {
      get(this: Element) { return scrollTops.get(this) ?? 0 },
      set(this: Element, value: number) { scrollTops.set(this, value) },
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
    if (savedScrollTop) Object.defineProperty(Element.prototype, 'scrollTop', savedScrollTop)
  })

  const numbers = (n: number) => Array.from({ length: n }, (_, i) => i)
  const containerOf = (view: ReturnType<typeof render>) => view.container.firstElementChild as HTMLElement

  it('should start at initialScrollOffset', () => {
    let view!: ReturnType<typeof render>
    act(() => {
      view = render(
        <VirtualMasonry
          data={numbers(500)}
          columns={3}
          getItemHeight={() => 50}
          height={400}
          initialScrollOffset={600}
          renderItem={({ item, style }) => <div style={style}>{item}</div>}
        />
      )
    })

    expect(containerOf(view).scrollTop).toBe(600)
  })

  it('should not scroll back to initialScrollOffset when the data grows', () => {
    const masonry = (n: number) => (
      <VirtualMasonry
        data={numbers(n)}
        columns={3}
        getItemHeight={() => 50}
        height={400}
        initialScrollOffset={600}
        renderItem={({ item, style }) => <div style={style}>{item}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(masonry(500)) })
    containerOf(view).scrollTop = 900

    act(() => { view.rerender(masonry(800)) })

    expect(containerOf(view).scrollTop).toBe(900)
  })

  it('should keep the DOM node of an item when another item is inserted before it', () => {
    type Row = { id: string }
    const abc: Row[] = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
    const masonry = (data: Row[]) => (
      <VirtualMasonry
        data={data}
        columns={2}
        getItemHeight={() => 50}
        height={400}
        getItemKey={(index, items) => (items[index] as Row).id}
        renderItem={({ item, style }) => <div data-testid={(item as Row).id} style={style}>{(item as Row).id}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(masonry(abc)) })
    const wrapperOf = (id: string) => view.getByTestId(id).parentElement
    const before = wrapperOf('a')

    act(() => { view.rerender(masonry([{ id: 'z' }, ...abc])) })

    expect(wrapperOf('a')).toBe(before)
  })

  it("should derive the column count from minColumnWidth when columns is 'auto'", () => {
    const masonry = (columns: number | 'auto') => (
      <VirtualMasonry
        data={numbers(40)}
        columns={columns}
        minColumnWidth={140}
        gap={10}
        getItemHeight={() => 50}
        height={400}
        renderItem={({ item, style }) => <div data-testid={`i${item}`} style={style}>{item}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(masonry('auto')) })

    // floor((620 + 10) / (140 + 10)) = 4 columns of 147.5px
    expect(containerOf(view).getAttribute('aria-colcount')).toBe('4')
    expect(view.getByTestId('i1').style.width).toBe('147.5px')
  })
})
