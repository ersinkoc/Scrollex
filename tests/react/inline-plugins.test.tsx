import React, { useMemo, useState } from 'react'
import { render, act, fireEvent } from '@testing-library/react'
import { VirtualList } from '../../src/react/components/virtual-list.js'
import { infiniteLoaderPlugin } from '../../src/plugins/core/infinite-loader.js'
import { keyboardNav } from '../../src/plugins/optional/keyboard-nav.js'
import { dragToReorder } from '../../src/plugins/optional/drag-to-reorder.js'
import type { DragToReorderAPI } from '../../src/plugins/optional/drag-to-reorder.js'

// `plugins={[somePlugin(...)]}` creates a new plugin on every render of the parent, and the list installs the new
// one in place of the old one: stateful plugins have to carry on instead of starting from scratch.
describe('plugins created inline', () => {
  const proto = Element.prototype
  const tops = new WeakMap<object, number>()
  let queue: Array<FrameRequestCallback | null> = []
  let clock = 1000
  const realRaf = globalThis.requestAnimationFrame
  const realCancel = globalThis.cancelAnimationFrame

  beforeEach(() => {
    Object.defineProperty(proto, 'clientHeight', { get: () => 400, configurable: true })
    Object.defineProperty(proto, 'clientWidth', { get: () => 300, configurable: true })
    Object.defineProperty(proto, 'scrollTop', { get() { return tops.get(this) ?? 0 }, set(v: number) { tops.set(this, v) }, configurable: true })
    queue = []
    clock = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.push(cb); return queue.length }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => { queue[id - 1] = null }) as typeof cancelAnimationFrame
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.requestAnimationFrame = realRaf
    globalThis.cancelAnimationFrame = realCancel
  })

  const flush = () => { for (let i = 0; i < 3; i++) { const q = queue; queue = []; q.forEach((cb) => cb?.(clock)) } }
  const data = Array.from({ length: 100 }, (_, i) => i)

  async function loadMoreCalls(inline: boolean) {
    let calls = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const onLoadMoreRef = { current: (() => Promise.resolve()) as () => Promise<void> }

    function Page() {
      const [, setBusy] = useState(false)
      const onLoadMore = async () => { calls++; setBusy(true); await gate; setBusy(false) }
      const stable = useMemo(() => infiniteLoaderPlugin({ threshold: 200, onLoadMore: () => onLoadMoreRef.current() }), [])
      onLoadMoreRef.current = onLoadMore
      return (
        <VirtualList
          data={data}
          itemHeight={50}
          height={400}
          plugins={[inline ? infiniteLoaderPlugin({ threshold: 200, onLoadMore }) : stable]}
          renderItem={({ item, style }) => <div style={style}>{item}</div>}
        />
      )
    }

    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<Page />) })
    const list = view.container.querySelector('[role="listbox"]') as HTMLElement
    const scrollNearBottom = async (top: number) => {
      clock += 500 // beyond the plugin's check debounce
      await act(async () => { tops.set(list, top); list.dispatchEvent(new Event('scroll')); flush() })
      await act(async () => { flush() })
    }
    await scrollNearBottom(4500)
    const afterFirst = calls
    await scrollNearBottom(4520) // the first load is still in flight
    const afterSecond = calls
    release()
    await act(async () => { await Promise.resolve() })
    await scrollNearBottom(4540) // the load has finished
    view.unmount()
    return { afterFirst, afterSecond, afterDone: calls }
  }

  it('should not start a second load while one is in flight when the loader is created inline', async () => {
    const expected = { afterFirst: 1, afterSecond: 1, afterDone: 2 }

    expect(await loadMoreCalls(false)).toEqual(expected)
    expect(await loadMoreCalls(true)).toEqual(expected)
  })

  async function focusSequence(inline: boolean) {
    const seen: number[] = []
    const onFocusRef = { current: (_index: number) => {} }

    function Page() {
      const [, setFocused] = useState<number | null>(null)
      const onFocus = (index: number) => { seen.push(index); setFocused(index) }
      const stable = useMemo(() => keyboardNav({ onFocus: (index) => onFocusRef.current(index) }), [])
      onFocusRef.current = onFocus
      return (
        <VirtualList
          data={data}
          itemHeight={40}
          height={400}
          plugins={[inline ? keyboardNav({ onFocus }) : stable]}
          renderItem={({ item, style }) => <div style={style}>{item}</div>}
        />
      )
    }

    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<Page />) })
    for (let i = 0; i < 3; i++) {
      await act(async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })) })
    }
    view.unmount()
    return seen
  }

  it('should keep walking down the list when keyboardNav is created inline and its onFocus sets state', async () => {
    expect(await focusSequence(false)).toEqual([0, 1, 2])
    expect(await focusSequence(true)).toEqual([0, 1, 2])
  })

  async function dragZeroOverThree(inline: boolean) {
    const reorders: Array<[number, number]> = []
    let dragOverAccepted: boolean | null = null

    function Page() {
      const [, setDragging] = useState(false)
      const options = {
        onReorder: (from: number, to: number) => { reorders.push([from, to]) },
        onDragStart: () => setDragging(true),
        onDragEnd: () => setDragging(false),
      }
      const stable = useMemo(() => dragToReorder(options), []) // eslint-disable-line react-hooks/exhaustive-deps
      const dnd = inline ? dragToReorder(options) : stable
      return (
        <VirtualList
          data={data}
          itemHeight={40}
          height={400}
          plugins={[dnd]}
          renderItem={({ item, index, style }) => (
            <div style={style} data-row={index} {...(dnd.api as DragToReorderAPI).getDragHandleProps(index)}>{item}</div>
          )}
        />
      )
    }

    let view!: ReturnType<typeof render>
    await act(async () => { view = render(<Page />) })
    const row = (i: number) => view.container.querySelector(`[data-row="${i}"]`) as HTMLElement
    const dataTransfer = { setData() {}, getData: () => '', effectAllowed: 'uninitialized', dropEffect: 'none' }

    await act(async () => { fireEvent.dragStart(row(0), { dataTransfer }) })
    await act(async () => { dragOverAccepted = !fireEvent.dragOver(row(3), { dataTransfer }) })
    await act(async () => { fireEvent.drop(row(3), { dataTransfer }) })
    await act(async () => { fireEvent.dragEnd(row(0), { dataTransfer }) })
    view.unmount()
    return { reorders, dragOverAccepted }
  }

  it('should keep a drag going when dragToReorder is created during render and onDragStart sets state', async () => {
    const control = await dragZeroOverThree(false)
    const inline = await dragZeroOverThree(true)

    expect(control.dragOverAccepted).toBe(true)
    expect(control.reorders).toHaveLength(1)
    expect(inline).toEqual(control)
  })
})
