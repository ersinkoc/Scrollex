import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'
import type { Kernel, Plugin } from '../../src/types.js'

// Plugins passed to a component run on its kernel: what that kernel reports has to match the rendered layout
describe('kernel seen by plugins', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(Element.prototype, 'clientWidth', { get: () => 400, configurable: true })
  })

  const data = (n: number) => Array.from({ length: n }, (_, i) => i)
  const row = ({ item, style }: { item: number; style: React.CSSProperties }) => <div style={style}>{item}</div>

  async function sizes(make: (n: number, cap: Plugin) => React.ReactElement, counts: number[]) {
    let kernel: Kernel | null = null
    const cap: Plugin = { name: 'cap', version: '1', type: 'optional', install(k) { kernel = k }, uninstall() {} }
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(make(counts[0]!, cap)) })
    const seen = [{ count: kernel!.getItemCount(), total: kernel!.getTotalSize() }]
    for (const n of counts.slice(1)) {
      await act(async () => { view.rerender(make(n, cap)) })
      seen.push({ count: kernel!.getItemCount(), total: kernel!.getTotalSize() })
    }
    view.unmount()
    return seen
  }

  it('should match the layout of a list (control)', async () => {
    const seen = await sizes((n, cap) => <VirtualList data={data(n)} itemHeight={50} height={400} plugins={[cap]} renderItem={row} />, [10, 50])

    expect(seen).toEqual([{ count: 10, total: 500 }, { count: 50, total: 2500 }])
  })

  it('should count items and sum rows for a grid', async () => {
    const seen = await sizes((n, cap) => <VirtualGrid data={data(n)} columns={4} itemHeight={50} height={400} width={400} plugins={[cap]} renderItem={row} />, [40, 100, 0])

    expect(seen).toEqual([{ count: 40, total: 500 }, { count: 100, total: 1250 }, { count: 0, total: 0 }])
  })

  it('should include the row gap in the total of a grid', async () => {
    const seen = await sizes((n, cap) => <VirtualGrid data={data(n)} columns={2} gap={10} itemHeight={50} height={400} width={400} plugins={[cap]} renderItem={row} />, [10])

    expect(seen).toEqual([{ count: 10, total: 5 * 50 + 4 * 10 }])
  })

  it('should keep the grid total right when the grid is scrolled after the count changed', async () => {
    const tops = new WeakMap<object, number>()
    let queue: Array<FrameRequestCallback | null> = []
    const realRaf = globalThis.requestAnimationFrame
    const realCancel = globalThis.cancelAnimationFrame
    Object.defineProperty(Element.prototype, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
    const flush = () => { for (let i = 0; i < 4; i++) { const q = queue; queue = []; q.forEach((cb) => cb?.(performance.now())) } }

    try {
      let kernel: Kernel | null = null
      const cap: Plugin = { name: 'cap', version: '1', type: 'optional', install(k) { kernel = k }, uninstall() {} }
      const grid = (n: number) => <VirtualGrid data={data(n)} columns={4} itemHeight={50} height={400} width={400} plugins={[cap]} renderItem={row} />
      let view!: ReturnType<typeof render>
      await act(async () => { view = render(grid(40)) })
      const box = view.container.firstElementChild as HTMLElement

      await act(async () => { view.rerender(grid(100)) })
      await act(async () => { tops.set(box, 100); box.dispatchEvent(new Event('scroll')); flush() })
      expect(kernel!.getTotalSize()).toBe(1250)

      await act(async () => { view.rerender(grid(40)) })
      await act(async () => { tops.set(box, 50); box.dispatchEvent(new Event('scroll')); flush() })
      expect(kernel!.getTotalSize()).toBe(500)
      view.unmount()
    } finally {
      globalThis.requestAnimationFrame = realRaf
      globalThis.cancelAnimationFrame = realCancel
    }
  })

  it('should follow the item count and the column heights of a masonry', async () => {
    const seen = await sizes((n, cap) => <VirtualMasonry data={data(n)} columns={2} getItemHeight={() => 100} height={400} width={400} plugins={[cap]} renderItem={row} />, [10, 50, 0])

    expect(seen).toEqual([{ count: 10, total: 500 }, { count: 50, total: 2500 }, { count: 0, total: 0 }])
  })
})
