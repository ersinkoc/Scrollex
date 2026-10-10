import React, { StrictMode } from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'


describe('initialScrollOffset', () => {
const proto = Element.prototype
const tops = new WeakMap<object, number>()
beforeEach(() => {
  Object.defineProperty(proto, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(proto, 'clientWidth', { get: () => 600, configurable: true })
  Object.defineProperty(proto, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
})

const data = Array.from({ length: 300 }, (_, i) => i)
const render1 = (kind: 'list' | 'grid' | 'masonry', offset: number) => {
  if (kind === 'list') return <VirtualList data={data} itemHeight={50} height={400} initialScrollOffset={offset} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
  if (kind === 'grid') return <VirtualGrid data={data} columns={3} itemHeight={50} height={400} initialScrollOffset={offset} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
  return <VirtualMasonry data={data} columns={3} getItemHeight={() => 50} height={400} initialScrollOffset={offset} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
}

async function scenario(kind: 'list' | 'grid' | 'masonry') {
  let r!: ReturnType<typeof render>
  await act(async () => { r = render(render1(kind, 100)) })
  const el = r.container.querySelector('[role]') as HTMLElement
  const atMount = tops.get(el)
  await act(async () => { tops.set(el, 777); el.dispatchEvent(new Event('scroll')) }) // the reader scrolls on
  await act(async () => { r.rerender(render1(kind, 500)) }) // the parent mirrors a different value into the prop
  const after = tops.get(el)
  r.unmount()
  return { atMount, after }
}

it('should not move the reader when initialScrollOffset changes after mount', async () => {
  const masonry = await scenario('masonry')
  const list = await scenario('list')
  const grid = await scenario('grid')
  expect(masonry).toEqual({ atMount: 100, after: 777 }) // control
  const ok = list.after === 777 && grid.after === 777
  expect(ok).toBe(true)
})

it('should apply the offset given at mount once, also under StrictMode', async () => {
  for (const kind of ['list', 'grid', 'masonry'] as const) {
    let r!: ReturnType<typeof render>
    await act(async () => { r = render(<StrictMode>{render1(kind, 300)}</StrictMode>) })
    const el = r.container.querySelector('[role]') as HTMLElement
    expect(tops.get(el)).toBe(300)
    r.unmount()
  }
})

it('should apply an offset that only becomes known after mount once and ignore later changes', async () => {
  for (const kind of ['list', 'grid', 'masonry'] as const) {
    let r!: ReturnType<typeof render>
    await act(async () => { r = render(render1(kind, 0)) })
    const el = r.container.querySelector('[role]') as HTMLElement
    expect(tops.get(el) ?? 0).toBe(0)
    await act(async () => { r.rerender(render1(kind, 400)) })
    expect(tops.get(el)).toBe(400)
    await act(async () => { tops.set(el, 650); el.dispatchEvent(new Event('scroll')) })
    await act(async () => { r.rerender(render1(kind, 900)) })
    expect(tops.get(el)).toBe(650)
    r.unmount()
  }
})

it('should start a remount from its own initial offset', async () => {
  for (const kind of ['list', 'grid'] as const) {
    let r!: ReturnType<typeof render>
    await act(async () => { r = render(render1(kind, 200)) })
    r.unmount()
    await act(async () => { r = render(render1(kind, 250)) })
    expect(tops.get(r.container.querySelector('[role]') as HTMLElement)).toBe(250)
    r.unmount()
  }
})
})

describe('initialScrollOffset in a browser that clamps scrollTop', () => {
  const tops = new WeakMap<object, number>()

  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 300, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
    // scrollHeight is the height of the inner element, like the browser's
    Object.defineProperty(Element.prototype, 'scrollHeight', { get() { const inner = (this as HTMLElement).firstElementChild as HTMLElement | null; return parseFloat(inner?.style.height ?? '') || 0 }, configurable: true })
    Object.defineProperty(Element.prototype, 'scrollTop', {
      get() { return tops.get(this) ?? 0 },
      set(v: number) { const max = Math.max(0, (this as HTMLElement).scrollHeight - 300); tops.set(this, Math.max(0, Math.min(max, v))) },
      configurable: true,
    })
  })

  const data = Array.from({ length: 200 }, (_, i) => i)
  const row = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style}>{item}</div>
  const scrollTopAfterMount = async (element: React.ReactElement) => {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element) })
    await act(async () => { await Promise.resolve() })
    const top = tops.get(view.container.firstElementChild as HTMLElement) ?? 0
    view.unmount()
    return top
  }

  it('should reach the offset in the list', async () => {
    expect(await scrollTopAfterMount(<VirtualList data={data} itemHeight={50} height={300} initialScrollOffset={1000} renderItem={row} />)).toBe(1000)
  })

  it('should reach the offset in the grid, whose height is only known after its layout', async () => {
    expect(await scrollTopAfterMount(<VirtualGrid data={data} columns={2} itemHeight={50} height={300} initialScrollOffset={1000} renderItem={row} />)).toBe(1000)
  })

  it('should reach the offset in the masonry, whose height is only known after its layout', async () => {
    expect(await scrollTopAfterMount(<VirtualMasonry data={data} columns={2} getItemHeight={() => 100} height={300} initialScrollOffset={1000} renderItem={row} />)).toBe(1000)
  })

  it.each(['list', 'grid', 'masonry'] as const)('should reach the offset in the %s when the data arrives after mount', async (kind) => {
    const el = (n: number) => {
      const d = Array.from({ length: n }, (_, i) => i)
      if (kind === 'list') return <VirtualList data={d} itemHeight={50} height={300} initialScrollOffset={1000} renderItem={row} />
      if (kind === 'grid') return <VirtualGrid data={d} columns={2} itemHeight={50} height={300} initialScrollOffset={1000} renderItem={row} />
      return <VirtualMasonry data={d} columns={2} getItemHeight={() => 100} height={300} initialScrollOffset={1000} renderItem={row} />
    }
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(el(0)) })
    expect(tops.get(view.container.firstElementChild as HTMLElement) ?? 0).toBe(0)
    await act(async () => { view.rerender(el(200)) })
    await act(async () => { await Promise.resolve() })
    expect(tops.get(view.container.firstElementChild as HTMLElement)).toBe(1000)
    view.unmount()
  })

  it('should not move the reader again when the grid grows later', async () => {
    const grid = (n: number) => <VirtualGrid data={Array.from({ length: n }, (_, i) => i)} columns={2} itemHeight={50} height={300} initialScrollOffset={500} renderItem={row} />
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(grid(200)) })
    const box = view.container.firstElementChild as HTMLElement
    expect(tops.get(box)).toBe(500)

    tops.set(box, 800) // the reader scrolled
    await act(async () => { view.rerender(grid(400)) })

    expect(tops.get(box)).toBe(800)
    view.unmount()
  })
})
