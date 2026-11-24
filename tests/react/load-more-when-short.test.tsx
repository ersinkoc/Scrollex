import React, { StrictMode } from 'react'
import { render, act } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { VirtualGrid } from '../../src/react/components/virtual-grid.js'
import { VirtualMasonry } from '../../src/react/components/virtual-masonry.js'

const proto = Element.prototype
const names = ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight'] as const
const saved: Record<string, PropertyDescriptor | undefined> = {}
const dims = { clientWidth: 400, clientHeight: 600, scrollWidth: 400, scrollHeight: 600 }
beforeEach(() => {
  Object.assign(dims, { clientWidth: 400, clientHeight: 600, scrollWidth: 400, scrollHeight: 600 })
  for (const k of names) { saved[k] = Object.getOwnPropertyDescriptor(proto, k); Object.defineProperty(proto, k, { get: () => dims[k], configurable: true }) }
})
afterEach(() => { for (const k of names) { if (saved[k]) Object.defineProperty(proto, k, saved[k]!); else delete (proto as any)[k] } })

const items = (n: number) => Array.from({ length: n }, (_, i) => i)
type Extra = Record<string, unknown>
const list = (data: number[], extra: Extra = {}) => (
  <VirtualList data={data} itemHeight={50} height={600} hasMore {...extra} renderItem={({ item, style }) => <div style={style}>{item}</div>} />
)

describe('load more when the content does not fill the viewport', () => {
it('a short list asks once after mount, also under StrictMode', async () => {
  const a = vi.fn()
  await act(async () => { render(list(items(3), { onLoadMore: a })) })
  expect(a).toHaveBeenCalledTimes(1)
  const b = vi.fn()
  await act(async () => { render(<StrictMode>{list(items(3), { onLoadMore: b })}</StrictMode>) })
  expect(b).toHaveBeenCalledTimes(1)
})

it('edge: a list that overflows does not ask; the scroll path still does', async () => {
  Object.assign(dims, { scrollHeight: 5000 })
  const onLoadMore = vi.fn()
  let r!: ReturnType<typeof render>
  await act(async () => { r = render(list(items(100), { onLoadMore })) })
  expect(onLoadMore).not.toHaveBeenCalled()
  const el = r.container.querySelector('[role="listbox"]') as HTMLElement
  Object.defineProperty(el, 'scrollTop', { value: 4300, configurable: true })
  await act(async () => { el.dispatchEvent(new Event('scroll')) })
  expect(onLoadMore).toHaveBeenCalledTimes(1)
})

it('edge: hasMore=false, isLoading=true and a missing callback never ask', async () => {
  const a = vi.fn(), b = vi.fn()
  await act(async () => { render(list(items(3), { onLoadMore: a, hasMore: false })) })
  await act(async () => { render(list(items(3), { onLoadMore: b, isLoading: true })) })
  await act(async () => { render(list(items(3))) })
  expect(a).not.toHaveBeenCalled()
  expect(b).not.toHaveBeenCalled()
})

it('edge: bounded - a load that adds nothing is not repeated; one that adds items (still short) asks again', async () => {
  const onLoadMore = vi.fn()
  let r!: ReturnType<typeof render>
  await act(async () => { r = render(list(items(3), { onLoadMore })) })
  await act(async () => { r.rerender(list(items(3), { onLoadMore, isLoading: true })) })
  await act(async () => { r.rerender(list(items(3), { onLoadMore, isLoading: false })) }) // empty page, hasMore stayed true
  await act(async () => { r.rerender(list(items(3), { onLoadMore })) })
  expect(onLoadMore).toHaveBeenCalledTimes(1)
  await act(async () => { r.rerender(list(items(5), { onLoadMore })) }) // 5 items = 250px, still short
  expect(onLoadMore).toHaveBeenCalledTimes(2)
  Object.assign(dims, { scrollHeight: 5000 })
  await act(async () => { r.rerender(list(items(100), { onLoadMore })) }) // now it overflows
  expect(onLoadMore).toHaveBeenCalledTimes(2)
})

it('edge: hasMore false then true again (new query, same length) asks again', async () => {
  const onLoadMore = vi.fn()
  let r!: ReturnType<typeof render>
  await act(async () => { r = render(list(items(3), { onLoadMore })) })
  await act(async () => { r.rerender(list(items(3), { onLoadMore, hasMore: false })) })
  await act(async () => { r.rerender(list(items(3), { onLoadMore })) })
  expect(onLoadMore).toHaveBeenCalledTimes(2)
})

it('edge: a horizontal list measures along x', async () => {
  Object.assign(dims, { clientHeight: 100, scrollHeight: 100, scrollWidth: 5000 }) // overflows along x only
  const far = vi.fn()
  await act(async () => { render(list(items(100), { onLoadMore: far, direction: 'horizontal', height: 100, width: 400 })) })
  expect(far).not.toHaveBeenCalled()
  Object.assign(dims, { scrollWidth: 400 }) // short along x
  const near = vi.fn()
  await act(async () => { render(list(items(3), { onLoadMore: near, direction: 'horizontal', height: 100, width: 400 })) })
  expect(near).toHaveBeenCalledTimes(1)
})

it('edge: grid asks once when its content does not fill the viewport and not when it does', async () => {
  const short = vi.fn()
  const grid = (data: number[], onLoadMore: () => void) => (
    <VirtualGrid data={data} columns={2} itemHeight={50} height={600} hasMore onLoadMore={onLoadMore}
      renderItem={({ item, style }) => <div style={style}>{item}</div>} />
  )
  await act(async () => { render(grid(items(4), short)) })
  expect(short).toHaveBeenCalledTimes(1)
  Object.assign(dims, { scrollHeight: 5000 })
  const long = vi.fn()
  await act(async () => { render(grid(items(200), long)) })
  expect(long).not.toHaveBeenCalled()
})

it('edge: a rejected load is reported instead of becoming an unhandled rejection', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const failure = new Error('Load failed')
  await act(async () => { render(list(items(3), { onLoadMore: () => Promise.reject(failure) })) })
  await act(async () => {})
  expect(errorSpy).toHaveBeenCalledWith('[Scrollex] Error in onLoadMore:', failure)
  errorSpy.mockRestore()
})

it('edge: masonry asks once when its content does not fill the viewport and not when it does', async () => {
  const short = vi.fn()
  const masonry = (data: number[], onLoadMore: () => void) => (
    <VirtualMasonry data={data} columns={2} getItemHeight={() => 50} height={600} hasMore onLoadMore={onLoadMore}
      renderItem={({ item, style }) => <div style={style}>{item}</div>} />
  )
  await act(async () => { render(masonry(items(4), short)) })
  expect(short).toHaveBeenCalledTimes(1)
  Object.assign(dims, { scrollHeight: 5000 })
  const long = vi.fn()
  await act(async () => { render(masonry(items(200), long)) })
  expect(long).not.toHaveBeenCalled()
})
})
