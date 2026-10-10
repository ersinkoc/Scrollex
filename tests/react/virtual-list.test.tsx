import React, { StrictMode } from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import type { Plugin } from '../../src/types.js'

describe('VirtualList', () => {
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

  it('should render unique, ordered rows under StrictMode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let container!: HTMLElement

    act(() => {
      container = render(
        <StrictMode>
          <VirtualList
            data={Array.from({ length: 1000 }, (_, i) => i)}
            itemHeight={50}
            height={600}
            renderItem={({ item, style }) => <div style={style}>{item}</div>}
          />
        </StrictMode>
      ).container
    })

    const indexes = [...container.querySelectorAll('[data-index]')].map((el) => Number(el.getAttribute('data-index')))
    expect(indexes).toEqual(Array.from({ length: 17 }, (_, i) => i))
    expect(errorSpy.mock.calls.filter(([message]) => String(message).includes('same key'))).toEqual([])
    errorSpy.mockRestore()
  })

  it('should install plugins from props once and uninstall them on unmount', () => {
    const install = vi.fn()
    const uninstall = vi.fn()
    const plugin: Plugin = { name: 'spy', version: '1.0.0', type: 'optional', install, uninstall }
    const list = () => (
      <VirtualList
        data={Array.from({ length: 100 }, (_, i) => i)}
        itemHeight={50}
        height={600}
        plugins={[plugin]}
        renderItem={({ item, style }) => <div style={style}>{item}</div>}
      />
    )
    let result!: ReturnType<typeof render>

    act(() => {
      result = render(list())
    })
    act(() => {
      result.rerender(list())
    })

    expect(install).toHaveBeenCalledTimes(1)
    act(() => {
      result.unmount()
    })
    expect(uninstall).toHaveBeenCalledTimes(1)
  })
})

describe('VirtualList changing inputs', () => {
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
    vi.restoreAllMocks()
  })

  type Row = { id: string }
  const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }))
  const innerHeight = (container: HTMLElement) => (container.firstElementChild!.firstElementChild as HTMLElement).style.height

  const numbers = (n: number) => (
    <VirtualList
      data={Array.from({ length: n }, (_, i) => i)}
      itemHeight={50}
      height={400}
      renderItem={({ item, style }) => <div style={style}>{item}</div>}
    />
  )

  const keyed = (data: Row[]) => (
    <VirtualList
      data={data}
      itemHeight={50}
      height={400}
      getItemKey={(index, items) => (items[index] as Row).id}
      renderItem={({ item, style }) => <div data-testid="row" style={style}>{(item as Row).id}</div>}
    />
  )

  it('should refresh the total size when the item count changes but the visible range does not', () => {
    let view!: ReturnType<typeof render>
    act(() => { view = render(numbers(100)) })
    expect(innerHeight(view.container)).toBe('5000px')

    act(() => { view.rerender(numbers(40)) })
    expect(innerHeight(view.container)).toBe('2000px')

    act(() => { view.rerender(numbers(120)) })
    expect(innerHeight(view.container)).toBe('6000px')
  })

  it('should refresh the total size and offsets when the estimated height changes but the visible range does not', () => {
    const estimated = (estimate: number) => (
      <VirtualList
        data={[0, 1, 2]}
        itemHeight="auto"
        estimatedItemHeight={estimate}
        height={400}
        renderItem={({ item, style }) => <div style={style}>{item}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(estimated(50)) })
    expect(innerHeight(view.container)).toBe('150px')

    act(() => { view.rerender(estimated(100)) })

    expect(innerHeight(view.container)).toBe('300px')
    const thirdRow = view.container.querySelectorAll('[data-index]')[2]!.firstElementChild as HTMLElement
    expect(thirdRow.style.transform).toBe('translateY(200px)')
  })

  it('should move following items when a measurement keeps the visible range', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = Number(this.dataset['virtualIndex']) === 2 ? 60 : 50
      return { width: 300, height, top: 0, left: 0, right: 300, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
    let view!: ReturnType<typeof render>
    act(() => {
      view = render(
        <VirtualList
          data={Array.from({ length: 30 }, (_, i) => i)}
          itemHeight="auto"
          estimatedItemHeight={50}
          height={400}
          renderItem={({ item, style, measureRef }) => <div ref={measureRef} data-testid={`i${item}`} style={style} />}
        />
      )
    })

    expect(view.getByTestId('i2').style.transform).toBe('translateY(100px)')
    expect(view.getByTestId('i3').style.transform).toBe('translateY(160px)')
  })

  it('should mount an empty list that keys rows by id', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let view!: ReturnType<typeof render>
    act(() => { view = render(keyed([])) })

    expect(view.queryAllByTestId('row')).toHaveLength(0)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('should key rows from the current data after the data grows', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let view!: ReturnType<typeof render>
    act(() => { view = render(keyed(rows(3))) })
    act(() => { view.rerender(keyed(rows(60))) })

    expect(view.queryAllByTestId('row')).toHaveLength(13)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('should apply a new itemHeight to the whole list', () => {
    const sized = (itemHeight: number) => (
      <VirtualList
        data={Array.from({ length: 1000 }, (_, i) => i)}
        itemHeight={itemHeight}
        height={400}
        renderItem={({ item, style }) => <div style={style}>{item}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(sized(50)) })
    act(() => { view.rerender(sized(80)) })

    expect(innerHeight(view.container)).toBe('80000px')
  })

  it('should keep each row in its own DOM node when the data is reordered without changing its length', () => {
    const abc: Row[] = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
    const keyedList = (data: Row[]) => (
      <VirtualList
        data={data}
        itemHeight={50}
        height={400}
        getItemKey={(index, items) => (items[index] as Row).id}
        renderItem={({ item, style }) => <div data-testid={(item as Row).id} style={style}>{(item as Row).id}</div>}
      />
    )
    let view!: ReturnType<typeof render>
    act(() => { view = render(keyedList(abc)) })
    const wrapperOf = (id: string) => view.getByTestId(id).parentElement
    const a = wrapperOf('a')
    const b = wrapperOf('b')

    act(() => { view.rerender(keyedList([abc[1]!, abc[0]!, abc[2]!, abc[3]!])) })

    expect(wrapperOf('a')).toBe(a)
    expect(wrapperOf('b')).toBe(b)
  })

  it('should measure the distance to the end on the scroll axis for onLoadMore', () => {
    const sizes: Record<string, number> = { scrollWidth: 5000, scrollHeight: 100, clientWidth: 400 }
    const saved = Object.keys(sizes).map((k) => [k, Object.getOwnPropertyDescriptor(Element.prototype, k)] as const)
    for (const [k, v] of Object.entries(sizes)) Object.defineProperty(Element.prototype, k, { get: () => v, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 100, configurable: true })
    try {
      const onLoadMore = vi.fn()
      let view!: ReturnType<typeof render>
      act(() => {
        view = render(
          <VirtualList
            data={Array.from({ length: 100 }, (_, i) => i)}
            direction="horizontal"
            itemHeight={50}
            height={100}
            width={400}
            hasMore
            onLoadMore={onLoadMore}
            renderItem={({ item, style }) => <div style={style}>{item}</div>}
          />
        )
      })
      const list = view.container.querySelector('[role="listbox"]') as HTMLElement
      const scrollLeftTo = (left: number) => act(() => {
        Object.defineProperty(list, 'scrollLeft', { value: left, configurable: true })
        list.dispatchEvent(new Event('scroll'))
      })

      scrollLeftTo(0)
      expect(onLoadMore).not.toHaveBeenCalled()
      scrollLeftTo(4500)
      expect(onLoadMore).toHaveBeenCalledTimes(1)
    } finally {
      for (const [k, d] of saved) { if (d) Object.defineProperty(Element.prototype, k, d); else delete (Element.prototype as any)[k] }
    }
  })
})

describe('VirtualList isVisible', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  it('should not mark a row that starts at the bottom edge of the viewport as visible', () => {
    const flags = new Map<number, boolean>()
    act(() => {
      render(
        <VirtualList
          data={Array.from({ length: 100 }, (_, i) => i)}
          itemHeight={50}
          height={400}
          overscan={3}
          renderItem={({ item, index, style, isVisible }) => { flags.set(index, isVisible); return <div style={style}>{item}</div> }}
        />
      )
    })

    expect(flags.get(7)).toBe(true) // 350..400 fills the end of the 400px viewport
    expect(flags.get(8)).toBe(false) // 400..450 is overscan only
    expect(flags.get(10)).toBe(false)
  })
})

describe('VirtualList first rows', () => {
  let savedWidth: PropertyDescriptor
  let savedHeight: PropertyDescriptor

  beforeEach(() => {
    savedWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!
    savedHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 600, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(Element.prototype, 'clientWidth', savedWidth)
    Object.defineProperty(Element.prototype, 'clientHeight', savedHeight)
  })

  const rowCount = (data: number[], itemHeight: number, overscan?: number) => {
    let view!: ReturnType<typeof render>
    act(() => {
      view = render(
        <VirtualList data={data} itemHeight={itemHeight} height={600} overscan={overscan} renderItem={({ item, style }) => <div style={style} data-row>{item}</div>} />
      )
    })
    const count = view.container.querySelectorAll('[data-row]').length
    view.unmount()
    return count
  }

  it('should render the only item of a one-item list', () => {
    expect(rowCount([1], 50)).toBe(1)
  })

  it('should render the first item when it is taller than the viewport and there is no overscan', () => {
    expect(rowCount([1, 2, 3], 1000, 0)).toBe(1)
  })

  it('should still render several rows for a longer list (control)', () => {
    expect(rowCount([1, 2], 50)).toBe(2)
  })
})
