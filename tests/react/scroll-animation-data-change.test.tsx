import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import type { VirtualListHandle } from '../../src/types.js'

// Props that change while a smooth scroll runs (an infinite-scroll page arrives, the layout changes) must not stop it
describe('smooth scroll while the inputs change', () => {
  const tops = new WeakMap<object, number>()
  let queue: Array<FrameRequestCallback | null> = []
  let clock = 0
  const realRaf = globalThis.requestAnimationFrame
  const realCancel = globalThis.cancelAnimationFrame

  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, Math.max(0, Math.min(100000, v))) }, configurable: true })
    queue = []
    clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.requestAnimationFrame = realRaf
    globalThis.cancelAnimationFrame = realCancel
  })

  const frame = (ms: number) => { clock += ms; const q = queue; queue = []; q.forEach((cb) => cb?.(clock)) }
  const data = (n: number) => Array.from({ length: n }, (_, i) => i)

  type Kind = 'list' | 'grid' | 'masonry'
  function element(kind: Kind, handle: React.Ref<VirtualListHandle>, count: number, gap: number) {
    const renderItem = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style}>{item}</div>
    if (kind === 'list') return <VirtualList ref={handle} data={data(count)} itemHeight={50} height={400} renderItem={renderItem} />
    if (kind === 'grid') return <VirtualGrid ref={handle} data={data(count)} columns={1} gap={gap} itemHeight={50} height={400} width={400} renderItem={renderItem} />
    return <VirtualMasonry ref={handle} data={data(count)} columns={1} gap={gap} getItemHeight={() => 50} height={400} width={400} renderItem={renderItem} />
  }

  it.each(['list', 'grid', 'masonry'] as const)('should reach the target in the %s when items are appended midway', async (kind) => {
    const handle = React.createRef<VirtualListHandle>()
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element(kind, handle, 100, 0)) })
    await act(async () => { queue = [] })
    const box = view.container.firstElementChild as HTMLElement

    await act(async () => { handle.current!.scrollTo(2000, { behavior: 'smooth', duration: 300 }) })
    await act(async () => { frame(100) })
    expect(tops.get(box)).toBeGreaterThan(0)
    expect(tops.get(box)).toBeLessThan(2000)

    await act(async () => { view.rerender(element(kind, handle, 120, 0)) })
    for (let i = 0; i < 6; i++) await act(async () => { frame(100) })

    expect(tops.get(box)).toBe(2000)
    view.unmount()
  })

  it('should reach the target in the masonry when the gap changes midway', async () => {
    const handle = React.createRef<VirtualListHandle>()
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(element('masonry', handle, 100, 0)) })
    await act(async () => { queue = [] })
    const box = view.container.firstElementChild as HTMLElement

    await act(async () => { handle.current!.scrollTo(1500, { behavior: 'smooth', duration: 300 }) })
    await act(async () => { frame(100) })
    await act(async () => { view.rerender(element('masonry', handle, 100, 8)) })
    for (let i = 0; i < 6; i++) await act(async () => { frame(100) })

    expect(tops.get(box)).toBe(1500)
    view.unmount()
  })
})
