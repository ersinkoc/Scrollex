// keyboardNav in a grid reveals the focused item's row: the kernel only knows the grid's cells (averaged size), so
// kernel.scrollToIndex placed items of lower rows by cell position and left their row mostly outside the viewport.
import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { keyboardNav } from '../../src/plugins/optional/keyboard-nav.js'
const proto = Element.prototype
const tops = new WeakMap<object, number>()
let queue: Array<FrameRequestCallback | null> = []
let clock = 1000
const realRaf = globalThis.requestAnimationFrame
const realCancel = globalThis.cancelAnimationFrame
beforeEach(() => {
  Object.defineProperty(proto, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(proto, 'clientWidth', { get: () => 400, configurable: true })
  Object.defineProperty(proto, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
  queue = []
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
})
afterEach(() => { vi.restoreAllMocks(); globalThis.requestAnimationFrame = realRaf; globalThis.cancelAnimationFrame = realCancel })
const flush = () => { for (let i = 0; i < 5; i++) { clock += 1000; const q = queue; queue = []; q.forEach((cb) => cb?.(clock)) } }
const data = Array.from({ length: 100 }, (_, i) => i)
const press = (key: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
const downs = (n: number) => Array.from({ length: n }, () => 'ArrowDown')

async function navigate(kind: 'grid' | 'list', keys: string[], gap = 0) {
  const plugin = kind === 'grid' ? keyboardNav({ orientation: 'grid', columns: 4 }) : keyboardNav()
  let view!: ReturnType<typeof render>
  await act(async () => {
    view = render(kind === 'grid'
      ? <VirtualGrid data={data} columns={4} gap={gap} itemHeight={100} height={400} width={400} plugins={[plugin]} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
      : <VirtualList data={data} itemHeight={100} height={400} plugins={[plugin]} renderItem={({ item, style }) => <div style={style}>{item}</div>} />)
  })
  await act(async () => { flush() })
  const scroller = view.container.querySelector(kind === 'grid' ? '[role="grid"]' : '[role="listbox"]') as HTMLElement
  for (const key of keys) {
    await act(async () => { press(key); flush() })
    await act(async () => { flush() })
  }
  const top = tops.get(scroller) ?? 0
  view.unmount()
  return top
}


describe('keyboardNav in a grid', () => {
  it('should scroll so that the whole row of the focused item is visible', async () => {
    expect(await navigate('list', downs(6))).toBe(200) // control: list row 5 = 500..600
    expect(await navigate('grid', downs(6))).toBe(200) // item 20 = row 5 = 500..600
  })

  it('should scroll back up to a row above the viewport', async () => {
    const top = await navigate('grid', [...downs(9), 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp'])
    // 9 downs: item 32 (row 8); 7 ups: item 4 (row 1 = 100..200), scroll follows it up
    expect(top).toBe(100)
  })

  it('should keep the row visible with a gap between rows', async () => {
    const top = await navigate('grid', downs(6), 10)
    const rowTop = 5 * 110
    expect(top).toBeLessThanOrEqual(rowTop)
    expect(top + 400).toBeGreaterThanOrEqual(rowTop + 100)
  })
})
