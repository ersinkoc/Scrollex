import React from 'react'
import { render, act } from '@testing-library/react'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'

const proto = Element.prototype
const tops = new WeakMap<object, number>()
let queue: Array<FrameRequestCallback | null> = []
const realRaf = globalThis.requestAnimationFrame
const realCancel = globalThis.cancelAnimationFrame
beforeEach(() => {
  Object.defineProperty(proto, 'clientHeight', { get: () => 400, configurable: true })
  Object.defineProperty(proto, 'clientWidth', { get: () => 300, configurable: true })
  Object.defineProperty(proto, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
  queue = []
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
})
afterEach(() => { globalThis.requestAnimationFrame = realRaf; globalThis.cancelAnimationFrame = realCancel })
const flush = () => { for (let i = 0; i < 4; i++) { const q = queue; queue = []; q.forEach((cb) => cb?.(performance.now())) } }

describe('VirtualMasonry isVisible', () => {
const data = Array.from({ length: 100 }, (_, i) => i)
async function mount(columns: number, heightOf: (i: number) => number, seen: Map<number, { visible: boolean; top: number; height: number }>) {
  let r!: ReturnType<typeof render>
  await act(async () => {
    r = render(<VirtualMasonry data={data} columns={columns} getItemHeight={(item) => heightOf(item as number)} height={400} overscan={3}
      renderItem={({ item, style, isVisible }) => {
        const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(String(style.transform))
        seen.set(item as number, { visible: isVisible, top: Number(m?.[2]), height: Number(style.height) })
        return <div style={style}>{item}</div>
      }} />)
  })
  await act(async () => { flush() })
  return r
}
const scrollTo = async (r: ReturnType<typeof render>, top: number) => {
  const el = r.container.querySelector('[role="grid"]') as HTMLElement
  await act(async () => { tops.set(el, top); el.dispatchEvent(new Event('scroll')); flush() })
  await act(async () => { flush() })
}

it('should report only the items inside the viewport as visible', async () => {
  const seen = new Map<number, { visible: boolean; top: number; height: number }>()
  await mount(1, () => 100, seen)
  expect([...seen].filter(([, v]) => v.visible).map(([i]) => i)).toEqual([0, 1, 2, 3])
  expect(seen.size).toBeGreaterThan(4)
})

it('should follow the scroll offset, hiding an item that ends exactly at the top', async () => {
  const seen = new Map<number, { visible: boolean; top: number; height: number }>()
  const r = await mount(1, () => 100, seen)
  seen.clear()
  await scrollTo(r, 1000) // rows 10..13 are in 1000..1400; row 9 ends exactly at 1000
  const visible = [...seen].filter(([, v]) => v.visible).map(([i]) => i)
  expect(visible).toEqual([10, 11, 12, 13])
  expect(seen.get(9)?.visible).toBe(false)
})

it('edge: multiple columns with uneven heights use each item\'s own geometry', async () => {
  const seen = new Map<number, { visible: boolean; top: number; height: number }>()
  const r = await mount(3, (i) => 60 + (i % 5) * 40, seen)
  seen.clear()
  await scrollTo(r, 500)
  for (const [i, v] of seen) {
    const expected = v.top + v.height > 500 && v.top < 900
    expect(v.visible, `item ${i} at ${v.top}+${v.height}`).toBe(expected)
  }
  expect([...seen.values()].some((v) => v.visible)).toBe(true)
  expect([...seen.values()].some((v) => !v.visible)).toBe(true)
})

it('should report nothing visible while the viewport has no height', async () => {
  const seen = new Map<number, { visible: boolean; top: number; height: number }>()
  Object.defineProperty(proto, 'clientHeight', { get: () => 0, configurable: true })
  await expect(mount(2, () => 100, seen)).resolves.toBeDefined()
  expect([...seen.values()].every((v) => !v.visible)).toBe(true)
})
})
